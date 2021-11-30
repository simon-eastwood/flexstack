import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import 'flexlayout-react/style/light.css'

import { Layout, Model, TabNode, TabSetNode, IJsonModel, Action, Actions, Node as FLNode } from 'flexlayout-react';

import { analyseModel, stackZAxis, IAnalyzedModel, stackYAxis } from './FlexModelUtils';

import useMedia from './hooks/useMediaQuery';
import useWindowSize from './hooks/useWindowSize';

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
        "minWidth": 510,
        "minHeight": 50,
        "children": [
          {
            "type": "tab",
            "name": "Things to try",
            "component": "text",
            "config": {
              "text": "<ul><li>drag tabs</li><li>drag splitters</li><li>double click on tab to rename</li><li>double click on tabstrip to maximize</li><li>use the Add button to add another tab</li></ul>"

            }
          }
        ]
      },

      {


        "type": "tabset",
        "weight": 50,
        "selected": 0,
        "minWidth": 510,
        "minHeight": 50,
        "children": [
          {
            "type": "tab",
            "name": "two",
            "component": "text",
            "config": { "text": "" }
          }
        ]
      },
      {
        "type": "tabset",
        "weight": 50,
        "selected": 0,
        "minWidth": 510,
        "minHeight": 50,

        "children": [
          {
            "type": "tab",
            "name": "three",
            "component": "text",
            "config": { "text": "" }
          }
        ]
      }


    ]
  }
};

const templateModel = analyseModel(Model.fromJson(json), "full");


function App() {
  // currentMOdel is what we're currently rendering.
  // If we need to alter the layout due to size restrictions, the previous state is saved in "fullModel" so that it can be restored later
  const [currentModel, setCurrentModel] = useState(() => { return templateModel });
  const [fullModel, setFullModel] = useState(() => { return currentModel });

  const [canvasToggleAbs, setCanvasToggleAbs] = useState(false);
  const [stackStrategy, setStackStrategy] = useState('Z');

  const containerRef = useRef(null);
  const layoutRef = useRef(null);



  // If too narrow for full model, save it and make an adapted version, 
  const isTooNarrowForFullModel = useMedia(`(max-width: ${fullModel.widthNeeded}px)`);
  useEffect(() => {
    if (currentModel) {
      if (!isTooNarrowForFullModel) {
        console.log("restoring model...")
        setCurrentModel(fullModel);
      } else {
        // analyse current model to prepare change
        let analysedModel = analyseModel(currentModel.model);

        // save this model
        let saveCurrentJson = currentModel.model.toJson();
        let copyOfCurrent = { ...analysedModel };
        copyOfCurrent.model = Model.fromJson(saveCurrentJson);
        setFullModel(copyOfCurrent);

        // alter current model
        let newModel: IAnalyzedModel;

        if (isTooNarrowForFullModel) {
          if (stackStrategy === 'Z') {
            newModel = stackZAxis(analysedModel);
            setCanvasToggleAbs(false);
          } else {
            newModel = stackYAxis(analysedModel);
          }
          setCurrentModel(newModel);
        }
      }
    }
  }, [isTooNarrowForFullModel]);


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
      config: { text: "i was added" }
    }, undefined);
  }

  const interceptAction = (action: Action) => {
    console.log(action);

    if (action.type === Actions.MOVE_NODE) {
      const fromNode = currentModel.model.getNodeById(action.data.fromNode);
      const toNode = currentModel.model.getNodeById(action.data.toNode);

      if ((fromNode && fromNode.getType() === TabNode.TYPE) &&
        (fromNode.getParent() && fromNode.getParent()!.getType() === TabSetNode.TYPE) &&
        (toNode && toNode.getType() === TabSetNode.TYPE)) {

        console.log("FROM width " + (fromNode.getParent()! as TabSetNode).getMinWidth());
        console.log("TO WIDTH = " + (toNode as TabSetNode).getMinWidth());
      } else {
        console.log("WIDZH LOST?")
      }
    }
    return action;
  }

  const changeStrategy = (event: any) => {
    setStackStrategy(event.target.value);
  }

  const modelChanged = (model: Model) => {
    console.log("model changed");
    console.log(model);

    // setCurrentModel(analyseModel(model));
  }


  return (

    <div className="outer" style={canvasToggleAbs ? { height: currentModel.heightNeeded + 'px', width: currentModel.widthNeeded + 'px' } : { height: '100%', width: '100%' }}>
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
