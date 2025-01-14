import React, { useEffect } from "react";
import styles from "./TextInput.css";
import { RecalculateStageRectContext } from '../../context'

const TextInput = ({
  placeholder,
  updateNodeConnections,
  onChange,
  data,
  step,
  type
}) => {
  const numberInput = React.useRef()
  const textInput = React.useRef()
  const recalculateStageRect = React.useContext(RecalculateStageRectContext)

  const handleDragEnd = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleDragEnd);
  };

  const handleMouseMove = e => {
    e.stopPropagation();
    updateNodeConnections();
  };

  const handlePossibleResize = e => {
    e.stopPropagation();
    recalculateStageRect();
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleDragEnd);
  };
  useEffect(() => {
    if (textInput.current) {
      const elem = textInput.current
      if (data) {
        elem.style.height = 0;
        elem.style.height = (elem.scrollHeight + 10) + "px";
      } else {
        elem.style.height = "auto";
      }
    }
  }, [data])

  return (
    <div className={styles.wrapper} data-flume-component="text-input">
      {type === "number" ? (
        <input
          data-flume-component="text-input-number"
          onKeyDown={e => {
            if(e.keyCode === 69){
              e.preventDefault()
              return false;
            }
          }}
          onChange={e => {
            const inputValue = e.target.value.replace(/e/g, "");
            if (!!inputValue) {
              const value = parseFloat(inputValue, 10);
              if (Number.isNaN(value)) {
                onChange(0);
              } else {
                onChange(value);
                numberInput.current.value = value;
              }
            }
          }}
          onBlur={e => {
            if (!e.target.value) {
              onChange(0);
              numberInput.current.value = 0;
            }
          }}
          step={step || "1"}
          onMouseDown={handlePossibleResize}
          type={type || "text"}
          placeholder={placeholder}
          className={styles.input}
          defaultValue={data}
          onDragStart={e => e.stopPropagation()}
          ref={numberInput}
        />
      ) : (
        <textarea
          data-flume-component="text-input-textarea"
          onChange={e => onChange(e.target.value)}
          onMouseDown={handlePossibleResize}
          type="text"
          placeholder={placeholder}
          className={styles.input}
          value={data}
          onDragStart={e => e.stopPropagation()}
          ref={textInput}
        />
      )}
    </div>
  );
};

export default TextInput;
