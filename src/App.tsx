import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import 'flexlayout-react/style/light.css'

import { Layout, Model, TabNode, TabSetNode, IJsonModel, Action, Actions, Node as FLNode } from 'flexlayout-react';

import { analyseModel, stackZAxis, IAnalyzedModel, stackYAxis, migrateModel, cloneModel } from './FlexModelUtils';

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
  // currentModel is what we're currently rendering.
  // If we need to alter the layout due to size restrictions, the previous state is saved in "stashedModels" so that it can be restored later
  const [stashedModels] = useState<IAnalyzedModel[]>([templateModel]);
  const [currentModel, _setCurrentModel] = useState(() => { return stashedModels[0] });

  const [canvasToggleAbs, setCanvasToggleAbs] = useState({ height: false, width: false });
  const [stackStrategy, setStackStrategy] = useState('Z');

  const containerRef = useRef(null);
  const layoutRef = useRef(null);


  const setCurrentModel = () => {
    // make sure that the current model is always pointing to the last in the stashed list
    _setCurrentModel(stashedModels[stashedModels.length - 1]);
  }



  // If the viewport is too narrow for the current model....
  const isTooNarrow = useMedia(`(max-width: ${currentModel.widthNeeded}px)`);
  useEffect(() => {
    console.log(`Too narrow: ${isTooNarrow} ${currentModel.widthNeeded}`)

    if (isTooNarrow) {

      let modelToAdapt = cloneModel(currentModel);

      // alter current model
      let alteredModel: IAnalyzedModel | undefined;

      switch (stackStrategy) {
        case 'X':
          setCanvasToggleAbs({ height: false, width: true });
          break;
        case 'Y':
          alteredModel = stackYAxis(modelToAdapt);
          break;
        case 'Z':
          alteredModel = stackZAxis(modelToAdapt);
          setCanvasToggleAbs({ height: false, width: false });
      }

      // If the adaption was successful, make this altered model the new current
      if (alteredModel) {
        stashedModels.push(alteredModel);
        console.log("Too Switching to NEW model: " + stashedModels.length);
        setCurrentModel();

      }

    } else if (stackStrategy === 'X') {
      // No need for absolute width anymore
      setCanvasToggleAbs({ height: false, width: false });
    }
  }, [isTooNarrow]);


  // is the viewport now wide enough to switch back to the previous model?
  const tooWide = stashedModels.length > 1 ? ((stashedModels[stashedModels.length - 2] as IAnalyzedModel).widthNeeded!) : 9999999999;
  const isTooWide = useMedia(`(min-width: ${tooWide}px`);
  useEffect(() => {
    console.log(`Too wide: ${isTooWide} ${tooWide} (looking at ${stashedModels.length - 2})`)


    if (isTooWide) {
      console.log("Too Switching BACK to  model: " + (stashedModels.length - 2));

      migrateModel(currentModel, stashedModels[stashedModels.length - 2]);
      stashedModels.pop();
      setCurrentModel();
    }

  }, [isTooWide]);



  // If too short for current model switch to absolute, 
  const isTooShort = useMedia(`(max-height: ${currentModel.heightNeeded}px)`);
  useEffect(() => {
    if (currentModel) {
      if (!isTooShort) {
        setCanvasToggleAbs({ height: false, width: canvasToggleAbs.width });
        console.log("REL CANVAS :" + currentModel.heightNeeded);
      } else {
        setCanvasToggleAbs({ height: true, width: canvasToggleAbs.width });

        console.log("ABS CANVAS :" + currentModel.heightNeeded);
      }
    }
  }, [isTooShort]);


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
    setTimeout(() => {
      console.log("Too timer...");
      stashedModels[stashedModels.length - 1] = analyseModel(currentModel.model, true /* update min sizes if needed*/);
      setCurrentModel();
    }, 100);

    return action;
  }

  const changeStrategy = (event: any) => {
    setCanvasToggleAbs({ height: false, width: false });
    setStackStrategy(event.target.value);
  }

  const modelChanged = (model: Model) => {
    console.log("Too model changed");
    console.log(model);

    stashedModels[stashedModels.length - 1] = analyseModel(currentModel.model, false /* avoid infintie loop*/);
    setCurrentModel();

  }

  const absStyle = {
    height: canvasToggleAbs.height ? currentModel.heightNeeded + 'px' : '100%',
    width: canvasToggleAbs.width ? currentModel.widthNeeded + 'px' : '100%'
  };

  return (


    <div className="outer" style={absStyle}>
      <span> Stacking strategy:</span>
      <select value={stackStrategy} onChange={changeStrategy}>
        <option value="X">X axis</option>
        <option value="Y">Y axis</option>
        <option value="Z">Z axis</option>
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
