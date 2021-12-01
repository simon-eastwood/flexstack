import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import 'flexlayout-react/style/light.css'

import { Layout, Model, TabNode, TabSetNode, IJsonModel, Action, Actions, Node as FLNode } from 'flexlayout-react';

import { analyseModel, stackZAxis, IAnalyzedModel, stackYAxis } from './FlexModelUtils';

import useMedia from './hooks/useMediaQuery';

var json: IJsonModel = {
  global: {
    "rootOrientationVertical": false
  }, // {tabSetEnableTabStrip:false}, // to have just splitters
  layout: {
    "type": "row",
    "weight": 100,
    "children": [
      {
        "type": "tabset",
        "weight": 50,
        "selected": 0,
        "children": [
          {
            "type": "tab",
            "name": "Things to try",
            "component": "text",
            "config": {
              "text": "<ul><li>drag tabs</li><li>drag splitters</li><li>double click on tab to rename</li><li>double click on tabstrip to maximize</li><li>use the Add button to add another tab</li></ul>",
              "minWidth": 510,
              "minHeight": 350,
            }
          }
        ]
      },

      {
        "type": "tabset",
        "weight": 50,
        "selected": 0,
        "children": [
          {
            "type": "tab",
            "name": "two",
            "component": "text",
            "config": {
              "text": "",
              "minWidth": 510,
              "minHeight": 350,
            }
          }
        ]
      },
      {
        "type": "tabset",
        "weight": 50,
        "selected": 0,
        "children": [
          {
            "type": "tab",
            "name": "three",
            "component": "text",
            "config": {
              "text": "",
              "minWidth": 510,
              "minHeight": 350
            }
          }
        ]
      }


    ]
  }
};

const templateModel = analyseModel(Model.fromJson(json), true);


function App() {
  // currentMOdel is what we're currently rendering.
  // If we need to alter the layout due to size restrictions, the previous state is saved in "stachedModel" so that it can be restored later
  const [currentModel, setCurrentModel] = useState(() => { return templateModel });
  const [stachedModel, setStachedModel] = useState<IAnalyzedModel>();

  const [canvasToggleAbs, setCanvasToggleAbs] = useState(false);
  const [stackStrategy, setStackStrategy] = useState('Z');

  const containerRef = useRef(null);
  const layoutRef = useRef(null);



  // If there is a stashed model, I want to switch back to it as soon as possible
  // If there is no stashed model (yet) then trigger when the current model becomes too big for viewport
  const isTooNarrow = useMedia(`(max-width: ${stachedModel ? (stachedModel as IAnalyzedModel).widthNeeded : currentModel.widthNeeded}px)`);
  useEffect(() => {
    if (currentModel) {
      if (!isTooNarrow) {
        if (stachedModel) {
          setCurrentModel(stachedModel);
          setStachedModel(undefined);
        }
      } else {
        // stash the current model
        let saveCurrentJson = currentModel.model.toJson();
        let copyOfCurrent = { ...currentModel };
        copyOfCurrent.model = Model.fromJson(saveCurrentJson);
        setStachedModel(copyOfCurrent);

        // alter current model
        let newModel: IAnalyzedModel;

        if (isTooNarrow) {
          if (stackStrategy === 'Z') {
            newModel = stackZAxis(currentModel);
            setCanvasToggleAbs(false);
          } else {
            newModel = stackYAxis(currentModel);
          }
          setCurrentModel(newModel);
        }
      }
    }
  }, [isTooNarrow]);


  // If too short for current model switch to absolute, 
  const isTooShortForCurrentModel = useMedia(`(max-height: ${currentModel.heightNeeded}px)`);
  useEffect(() => {
    if (currentModel) {
      if (!isTooShortForCurrentModel) {
        setCanvasToggleAbs(false); console.log("REL CANVAS :" + currentModel.heightNeeded);
      } else {
        setCanvasToggleAbs(true); console.log("ABS CANVAS :" + currentModel.heightNeeded);
      }
    }
  }, [isTooShortForCurrentModel]);


  const factory = (node: TabNode) => {
    var component = node.getComponent();
    if (component === "text") {
      return <div dangerouslySetInnerHTML={{ __html: node.getConfig().text }} />;
    }
  }

  const onAdd = (event: any) => {
    (layoutRef.current! as Layout).addTabWithDragAndDropIndirect("Add panel<br>(Drag to location)", {
      component: "text",
      name: "added",
      config: { text: "i was added", minHeight: 300, minWidth: 400 }
    }, undefined);
  }

  const interceptAction = (action: Action) => {
    console.log(action);

    // when tabs are moved by the user, this can lead to a "divide" whereby a new tabset is created automatically for the tab
    // this new tabset will not have a minimum size and so this needs to be set
    // also for deletion of tabs or addition of nodes, the size may be impacted
    setTimeout(() => { setCurrentModel(analyseModel(currentModel.model, true /* update min sizes if needed*/)); }, 100);

    return action;
  }

  const changeStrategy = (event: any) => {
    setStackStrategy(event.target.value);
  }

  const modelChanged = (model: Model) => {
    console.log("model changed");
    console.log(model);

    setCurrentModel(analyseModel(model, false /* avoid infinite loop*/));
  }


  return (

    <div className="outer" style={canvasToggleAbs ? { height: currentModel.heightNeeded + 'px' } : { height: '100%' }}>
      <span> Stacking strategy:</span>
      <select value={stackStrategy} onChange={changeStrategy}>
        <option value="Z">Z axis</option>
        <option value="Y">Y axis</option>
      </select>
      <button onClick={onAdd}>Add</button>
      <div className="inner" >
        {currentModel && (
          <Layout ref={layoutRef}
            onAction={interceptAction}
            onModelChange={modelChanged}
            model={currentModel.model}
            factory={factory} />)}
      </div>
    </div>

  );
}

export default App;
