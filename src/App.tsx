import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import 'flexlayout-react/style/light.css'

import { Layout, Model, TabNode, TabSetNode, IJsonModel, Action, Actions, Node as FLNode } from 'flexlayout-react';

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
  const [model, setModel] = useState(Model.fromJson(json));

  const containerRef = useRef(null);
  const layoutRef = useRef(null);

  // When crossing breakpoint, toggle maximise
  const isTooSmall = useMedia('(max-width: 600px)');
  useEffect(() => {
    if (model) {
      let selectedNode: FLNode | undefined = undefined;
      model.visitNodes(node => {
        if (!selectedNode && node.getType().toLowerCase() === 'tabset') {
          // simply take the first tabset node we get
          selectedNode = node;
        }
      });
      if (selectedNode) {
        const isAlreadyMaximised = (selectedNode as TabSetNode).isMaximized();
        if (isAlreadyMaximised !== isTooSmall) {
          model.doAction(
            Actions.maximizeToggle((selectedNode as FLNode).getId()),
          );
          setModel(model);
        }
      }
    }
  }, [isTooSmall, model]);



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
        {model && (
          <Layout ref={layoutRef}
            onAction={interceptAction}
            model={model}
            factory={factory} />)}
      </div>
    </div>

  );
}

export default App;
