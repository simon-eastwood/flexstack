import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import 'flexlayout-react/style/light.css'

import { Layout, Model, TabNode, TabSetNode, IJsonModel, Action, Actions, Node as FLNode, DockLocation } from 'flexlayout-react';

import { analyseModel, IAnalyzedModel, migrateModel, cloneModel, removeTabset } from './FlexModelUtils';

import useMedia from './hooks/useMediaQuery';

import { loadTemplateModel } from './LoadTemplate'


function App() {
  // currentModel is what we're currently rendering.
  // If we need to alter the layout due to size restrictions, the previous state is saved in "stashedModels" so that it can be restored later
  const [stashedModels, _setStashedModels] = useState<IAnalyzedModel[]>(() => { return [loadTemplateModel(DockLocation.CENTER)] });
  const [maxPanels, setMaxPanels] = useState(5);

  const [canvasToggleAbs, setCanvasToggleAbs] = useState({ height: false, width: false });
  const [stackStrategy, setStackStrategy] = useState('Z');


  const layoutRef = useRef(null);


  const currentModel = stashedModels[stashedModels.length - 1];


  const stashPush = (model: IAnalyzedModel) => {
    const newStash = stashedModels.concat(model);
    _setStashedModels(newStash);
    console.log("=== PUSH"); console.log(newStash);
  }

  const stashPop = () => {
    console.log("before pop");
    console.log(stashedModels);
    const newStash = stashedModels.slice(0, -1);
    _setStashedModels(newStash);
    console.log("=== POP"); console.log(newStash)
  }

  const stashLoad = (model: IAnalyzedModel) => {
    const newStash = [model];
    _setStashedModels(newStash);
  }


  const downsizeModel = (stackDirection: DockLocation) => {
    let alteredModel = cloneModel(currentModel);
    let previousModelWidth = alteredModel.widthNeeded;

    do {
      let m = removeTabset(alteredModel.model, stackDirection);
      alteredModel = analyseModel(m);

      // if that helped, push altered model onto the stack
      if (alteredModel.widthNeeded != previousModelWidth) {
        stashPush(alteredModel);
      }
      alteredModel = cloneModel(alteredModel);
    } while (alteredModel.widthNeeded !== previousModelWidth && alteredModel.widthNeeded! > window.innerWidth)

    // keep removing tabsets until its narrow enough, or we're not making any further progress
  }



  // If the viewport is too narrow for the current model....
  const isTooNarrow = useMedia(`(max-width: ${currentModel.widthNeeded}px)`);
  useEffect(() => {

    if (isTooNarrow) {
      console.log("Too Narrow " + currentModel.widthNeeded);

      switch (stackStrategy) {
        case 'X':
          setCanvasToggleAbs({ height: false, width: true });
          break;
        case 'Y':
          downsizeModel(DockLocation.BOTTOM);
          break;
        case 'Z':
          downsizeModel(DockLocation.CENTER);
          setCanvasToggleAbs({ height: false, width: false });
      }

    } else if (stackStrategy === 'X') {
      // No need for absolute width anymore
      setCanvasToggleAbs({ height: false, width: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTooNarrow]);


  // is the viewport now wide enough to switch back to the previous model?
  const tooWide = stashedModels.length > 1 ? ((stashedModels[stashedModels.length - 2] as IAnalyzedModel).widthNeeded!) : 9999999999;
  console.log("===> too wide is " + tooWide);
  const isTooWide = useMedia(`(min-width: ${tooWide}px`);
  useEffect(() => {
    console.log(`Too wide: ${isTooWide} ${tooWide} (looking at ${stashedModels.length - 2})`)

    if (isTooWide) {
      migrateModel(currentModel, stashedModels[stashedModels.length - 2]);
      stashPop();
      // _setStashedModels(stashedModels); console.log("====>calling set stashed models");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }, 100);

    return action;
  }

  const changeStrategy = (event: any) => {
    setCanvasToggleAbs({ height: false, width: false });
    setStackStrategy(event.target.value);
  }

  const loadPanels = (event: any) => {
    console.log("loading ... ");
    setMaxPanels(parseInt(event.target.value));
    stashLoad(loadTemplateModel(DockLocation.CENTER, parseInt(event.target.value)));
    // stashLoad(stashedModels[0]);
    console.log("set current model "); console.log(stashedModels);

    console.log("===UPDATED");
  }

  const modelChanged = (model: Model) => {
    console.log("Too model changed");
    console.log(model);

    stashedModels[stashedModels.length - 1] = analyseModel(currentModel.model, false /* avoid infintie loop*/);

  }

  const absStyle = {
    height: canvasToggleAbs.height ? currentModel.heightNeeded + 'px' : '100%',
    width: canvasToggleAbs.width ? currentModel.widthNeeded + 'px' : '100%'
  };

  console.log("===RENDERING : " + stashedModels.length + " " + stashedModels[stashedModels.length - 1].widthNeeded);
  console.log("==== current model width is " + currentModel.widthNeeded); console.log(currentModel);

  return (


    <div className="outer" style={absStyle}>
      <button onClick={onAdd}>Add Panel</button>
      <span> Stacking strategy:</span>
      <select value={stackStrategy} onChange={changeStrategy}>
        <option value="X">X axis</option>
        <option value="Y">Y axis</option>
        <option value="Z">Z axis</option>
      </select>
      <span> Number of Panels:</span>
      <select value={maxPanels} onChange={loadPanels}>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
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
