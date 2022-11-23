![](https://raw.githubusercontent.com/chrisjpatty/flume/master/logo.png?token=ADRZXI4TFKM3FXBEBQHQURK6QIJ6Q)

[![NPM](https://img.shields.io/npm/v/flume.svg)](https://www.npmjs.com/package/flume) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![Minzip Size](https://badgen.net/bundlephobia/minzip/flume)](https://bundlephobia.com/result?p=flume)

# Flume

This is a fork from Chris Patty's [Flume](https://flume.dev) library, including for now a workflow engine.

## Guides & Examples

[flume.dev](https://flume.dev)

## Install

```bash
npm install --save flume
```

## Usage

### WorkflowEngine

It's a workflow runner.

The signature is almost the same as RootEngine, but it has a few extra arguments.

```jsx
const engine = new WorkflowEngine(
    config,     //Same as used on RootEngine()
    resolvePorts, // Same as used on RootEngine()
    resolveNodes,  // Same as used on RootEngine()
    executeActivity,
    key,
    storage
);
```

**executeActivity** is a method which is called when an activity is found. Signature is:

```jsx
(node, inputValues, nodeType, context, controls)
```
Where:
- **node** is the activity node
- **inputValues** are the input values calculated so far
- **nodeType** is the type of the node
- **context** contains the current context, plus any variables received from resumed operations. More on that later.
- **controls** contains two functions: **pause** and **resume**. `pause` will accept the variable name the engine must save when the process is resumed, and `resume` will accept the value to resume the process from. Note that when the process is resumed, `executeActivity` is called again for the activity that paused the process, so be sure to check if the `context` has your value.

**key** is the current key of the process, and

**storage** is the storage engine to use. It has similar signature from `sessionStorage` and `localStorage`.

The flow is controlled by ports of type `route`. A root node must exist with an output port of type `route`, and any activity node must have one input port and one output port of type `route`. Every activity node must be connected for the workflow to work.

To start the workflow, call `engine.start(nodes)`.

Any pause or resume operation will be handled by the `executeActivity` method, using the `pause` and `resume` functions from the `controls` object.

If you need a more persistent workflow, like for long running processes or waiting user response, you must wrap the `storage` object and inform it to the WorkflowEngine. Calls to `pause` and `resume` will dispatch the current state to the storage engine. When the process ends, the storage will be called to remove the state.

## Help needed!

I'm looking for help to improve the documentation and examples. If you want to help, please contact me!

### Defining your nodes

Import `FlumeConfig` and use it to define the nodes and ports that will make up your node editor.

```jsx
import { FlumeConfig, Controls, Colors } from "flume";

const flumeConfig = new FlumeConfig()

flumeConfig
  .addPortType({
    type: "number",
    name: "number",
    label: "Number",
    color: Colors.red,
    controls: [
      Controls.number({
        name: "num",
        label: "Number"
      })
    ]
  })
  .addNodeType({
    type: "number",
    label: "Number",
    initialWidth: 150,
    inputs: ports => [
      ports.number()
    ],
    outputs: ports => [
      ports.number()
    ]
  })
  .addNodeType({
    type: "addNumbers",
    label: "Add Numbers",
    initialWidth: 150,
    inputs: ports => [
      ports.number({name: "num1"}),
      ports.number({name: "num2"})
    ],
    outputs: ports => [
      ports.number({name: "result"})
    ]
  })
```

### Rendering the node editor

To render the node editor, import `NodeEditor` and pass it your nodeTypes and portTypes from the configuration you created.

```jsx
import React from 'react'
import { NodeEditor } from 'flume'
import config from './config'

const App = () => {

  return (
    <div style={{width: 600, height: 800}}> // Give the wrapper a width & height
      <NodeEditor
        nodeTypes={config.nodeTypes}
        portTypes={config.portTypes}
      />
    </div>
  )
}
```

For more complete documentation visit: [flume.dev](https://flume.dev)

## License

MIT © [chrisjpatty](https://github.com/chrisjpatty)
