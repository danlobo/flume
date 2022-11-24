import './require-babel-polyfill' // for async shenanigans to work with babel
import { LocalStorage } from './LocalStorage';
import { LoopError } from './LoopError';
import { ObjectStorageWrapper } from './ObjectStorageWrapper';

const isPromise = (p) => typeof p == 'object' && typeof p.then == 'function'

export class WorkflowEngine {
  constructor(config, resolveInputControls, fireNodeFunction, executeActivity, key, storage) {
    if (!storage) {
      storage = new LocalStorage();
    }

    this.key = key;
    this.storage = new ObjectStorageWrapper(storage);
    this.config = config;
    this.fireNodeFunction = fireNodeFunction;
    this.resolveInputControls = resolveInputControls;
    this.executeActivity = executeActivity;
    this.loops = 0;
    this.maxLoops = 1000;
  }
  resetLoops = maxLoops => {
    this.maxLoops = maxLoops !== undefined ? maxLoops : 1000;
    this.loops = 0;
  };
  checkLoops = () => {
    if (this.maxLoops >= 0 && this.loops > this.maxLoops) {
      throw new LoopError(
        "Max loop count exceeded.",
        LoopError.maxLoopsExceeded
      );
    } else {
      this.loops++;
    }
  };
  async getRootNode (nodes) {
    const roots = Object.values(nodes).filter(n => n.root);
    if (roots.length > 1) {
      throw new Error(
        "The root engine must not be called with more than one root node."
      );
    }
    return roots[0];
  };
  async resolveInputValues (node, nodeType, nodes, context, state) {
    let inputs = nodeType.inputs
    if (typeof inputs === 'function') {
      const localVars = state && state.localVars && state.localVars[node.id] ? state.localVars[node.id] : {}
      const globalVars = state && state.globalVars ? state.globalVars : {}
      inputs = inputs(node.inputData, node.connections, { ...context, localVars, globalVars })
    }
    const obj = {}
    for(const input of inputs) {
      const inputConnections = node.connections.inputs[input.name] || [];
      if (inputConnections.length > 0) {
        obj[input.name] = await this.getValueOfConnection(
          inputConnections[0],
          nodes,
          context,
          state
        );
      } else {
        const controlValues = this.resolveInputControls(
          input.type,
          node.inputData[input.name] || {},
          context
        )
        obj[input.name] = isPromise(controlValues) ? await controlValues : controlValues;
      }
    }
    return obj;
  };
  async getValueOfConnection (connection, nodes, context, state) {
    this.checkLoops();
    const outputNode = nodes[connection.nodeId];
    const outputNodeType = this.config.nodeTypes[outputNode.type];
    const inputValues = await this.resolveInputValues(
      outputNode,
      outputNodeType,
      nodes,
      context,
      state
    );

    const localVars = state && state.localVars && state.localVars[outputNode.id] ? state.localVars[outputNode.id] : {}
    const globalVars = state && state.globalVars ? state.globalVars : {}

    const outputValue = this.fireNodeFunction(
      outputNode,
      inputValues,
      outputNodeType,
      { ...context, localVars, globalVars }
    );

    this.resetLoops();

    const outputResult = isPromise(outputValue) ? (await outputValue)[connection.portName] : outputValue[connection.portName];
    return outputResult;
  };

  async iterateNodes(state, node, nodes, options = {}) {
    let currentNode = node
    while (currentNode) {
      let outputs = currentNode.connections.outputs;
      const currentNodeType = this.config.nodeTypes[currentNode.type];

      const localVars = state && state.localVars && state.localVars[currentNode.id] ? state.localVars[currentNode.id] : {}
      const globalVars = state && state.globalVars ? state.globalVars : {}

      const inputValues = await this.resolveInputValues(
        currentNode,
        currentNodeType,
        nodes,
        options.context,
        state
      );

      let pauseCalled = false;
      let execRet = this.executeActivity(currentNode, inputValues, currentNodeType, {
          context: options.context, localVars, globalVars
        },
        {
          pause: (returnVariable) => { this.pause(state, returnVariable); pauseCalled = true; },
          resume: (returnValue) => this.resume(returnValue, nodes, options)
        }
      )
      if (isPromise(execRet)) {
        execRet = await execRet
      }

      if (pauseCalled) {
        return state
      }

      if (typeof outputs === 'function') {
        outputs = outputs(currentNode.outputData, currentNode.connections, {
          ...options.context, localVars, globalVars
        });
      }
      const selectedRoute = execRet && execRet.route ? execRet.route : 'route'
      if (outputs[selectedRoute] && outputs[selectedRoute].length == 1) {
        const connection = outputs[selectedRoute][0];

        const outputNode = nodes[connection.nodeId];
        state.currentNode = { id: outputNode.id, type: outputNode.type }

        currentNode = outputNode;
      } else {
        currentNode = null;
      }
    }
    return null
  }

  async start(nodes, options = {}) {
    if (this.storage.getItem(this.key) != null) {
      console.error('Already started')
      return
    }
    const currentState = { key: this.key, state: 'running', localVars: {}, globalVars: {}, currentNode: null }

    const rootNode = options.rootNodeId
    ? nodes[options.rootNodeId]
    : await this.getRootNode(nodes);

    if (!rootNode) {
      console.error(
        "A root node was not found. The Workflow Engine requires that exactly one node be marked as the root node."
      );
      return {};
    }

    currentState.currentNode = { id: rootNode.id, type: rootNode.type }
    const state = await this.iterateNodes(currentState, rootNode, nodes, options.context)
    if (!state) {
      this.storage.removeItem(this.key)
    }
    return state
  };

  async pause(state, returnVariable) {
    if (state == null) {
      console.error('Not started')
      return null
    }

    state.state = 'paused'
    state.returnVariable = returnVariable
    this.storage.setItem(this.key, state)

    return true
  };

  async stop() {
    this.storage.removeItem(this.key)
  }

  async resume(returnValue, nodes, options = {}) {
    const state = this.storage.getItem(this.key)
    if (!state) {
      console.error('No state to resume')
      return null
    }

    if (state.state !== 'paused') {
      console.error('Not paused')
      return null
    }

    state.state = 'running'

    const currentNode = nodes[state.currentNode.id]

    if (!state.localVars)  state.localVars = {}
    if (!state.localVars[currentNode.id])  state.localVars[currentNode.id] = {}

    state.localVars[currentNode.id][state.returnVariable] = returnValue

    const state1 = await this.iterateNodes(state, currentNode, nodes, options)
    if (!state1) {
      this.storage.removeItem(this.key)
    }
    return state
  };
}
