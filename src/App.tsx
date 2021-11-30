import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import 'flexlayout-react/style/light.css'

import { Layout, Model, TabNode, TabSetNode, IJsonModel, Action, Actions, Node as FLNode } from 'flexlayout-react';

import { analyseModel, stackZAxis, IAnalyzedModel } from './FlexModelUtils';

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
        "minWidth": 200,
        "minHeight": 200,
        "children": [
          {
            "type": "tab",
            "name": "Things to try",
            "component": "text",
            "config": { "text": "<ul><li>drag tabs</li><li>drag splitters</li><li>double click on tab to rename</li><li>double click on tabstrip to maximize</li><li>use the Add button to add another tab</li></ul>" }
          }
        ]
      },

      {


        "type": "tabset",
        "weight": 50,
        "selected": 0,
        "minWidth": 200,
        "minHeight": 200,
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
        "minWidth": 200,
        "minHeight": 200,

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



function App() {
  // currentMOdel is what we're currently rendering.
  // If we need to alter the layout due to size restrictions, the previous state is saved in "fullModel" so that it can be restored later
  const [currentModel, setCurrentModel] = useState(() => { return analyseModel(Model.fromJson(json)) });
  const [fullModel, setFullModel] = useState(() => { return currentModel });
  const [canvas, setCanvas] = useState({ absoluteCanvasHeight: false, absoluteCanvasWidth: false });

  const containerRef = useRef(null);
  const layoutRef = useRef(null);

  // When crossing breakpoint, 
  const isTooSmall = useMedia('(max-width: 600px)');
  useEffect(() => {
    if (isTooSmall) {
      if (currentModel) {
        console.log("resizing model...")
        // analyse current model
        let analysedModel = analyseModel(currentModel.model);

        // save this model
        let saveCurrentJson = currentModel.model.toJson();
        let copyOfCurrent = { ...analysedModel };
        copyOfCurrent.model = Model.fromJson(saveCurrentJson);
        setFullModel(copyOfCurrent);

        // alter current model
        let newModel = stackZAxis(analysedModel);

        setCurrentModel(newModel)
      }
    } else {
      console.log("restoring model...")

      setCurrentModel(fullModel)
    }

  }, [isTooSmall]);



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
    return action;
  }


  return (

    <div className="outer" >
      <button onClick={onAdd}>Add</button>
      <div className="inner" ref={containerRef}>
        {currentModel && (
          <Layout ref={layoutRef}
            onAction={interceptAction}
            model={currentModel.model}
            factory={factory} />)}
      </div>
    </div>

  );
}

export default App;
