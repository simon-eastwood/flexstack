import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import 'flexlayout-react/style/light.css'

import { Layout, Model, TabNode, Action, DockLocation } from 'flexlayout-react';

import { analyseModel, IAnalyzedModel, migrateModel, cloneModel, removeTabset, moveTabset } from './FlexModelUtils';

import useMedia from './hooks/useMediaQuery';

import { loadTemplateModel } from './LoadTemplate'


function App() {
  // currentModel is what we're currently rendering.
  // If we need to alter the layout due to size restrictions, the previous state is saved in "stashedModels" so that it can be restored later
  const [stashedModels, _setStashedModels] = useState<IAnalyzedModel[]>(() => {
    // this is now hardocded but it should be deduced by analysing the template model for this task
    const currentWidth = window.innerWidth;
    let defaultNrPanels;
    if (currentWidth > 1652) {
      defaultNrPanels = 5;
    } else if (currentWidth > 1652 - 50) {
      defaultNrPanels = 4;
    } else if (currentWidth > (1652 - 50) - 50) {
      defaultNrPanels = 3;
    } else if (currentWidth > ((1652 - 50) - 50) - 50) {
      defaultNrPanels = 2;
    } else {
      defaultNrPanels = 1;
    }
    return [loadTemplateModel(DockLocation.CENTER, defaultNrPanels)]
  });
  const [maxPanels, setMaxPanels] = useState(5);

  const [canvasToggleAbs, setCanvasToggleAbs] = useState({ height: false, width: false });
  const [stackStrategy, setStackStrategy] = useState('NONE');


  const layoutRef = useRef(null);

  const currentModel = stashedModels[stashedModels.length - 1];


  const stashPop = () => {
    const newStash = stashedModels.slice(0, -1);
    _setStashedModels(newStash);
  }

  const stashSet = (model: IAnalyzedModel[]) => {
    _setStashedModels(model);
  }


  const downsizeModel = (stackDirection: DockLocation) => {
    let alteredModel = cloneModel(currentModel);
    let previousModelWidth = alteredModel.widthNeeded;

    const newStash = [...stashedModels];

    do {
      let m;
      if (stackDirection === DockLocation.BOTTOM) {
        m = moveTabset(alteredModel.model);
      } else {
        m = removeTabset(alteredModel.model);
      }
      alteredModel = analyseModel(m);


      // if that helped, push altered model onto the stack
      if (alteredModel.widthNeeded !== previousModelWidth) {
        newStash.push(alteredModel);
      }
      alteredModel = cloneModel(alteredModel);
    } while (alteredModel.widthNeeded !== previousModelWidth && alteredModel.widthNeeded! > window.innerWidth)
    // keep removing tabsets until its narrow enough, or we're not making any further progress

    // note: cannot use push in a loop because setState is asyncrhonous and only the last call to setState persists
    stashSet(newStash);
  }



  // If the viewport is too narrow for the current model....
  const isTooNarrow = useMedia(`(max-width: ${currentModel.widthNeeded}px)`);
  useEffect(() => {

    if (isTooNarrow) {
      switch (stackStrategy) {
/*         case 'X':
          setCanvasToggleAbs({ height: false, width: true });
          break;
        case 'Y':
          console.log("Y STACK")
          downsizeModel(DockLocation.BOTTOM);
          break;
 */        case 'Z':
          downsizeModel(DockLocation.CENTER);
          setCanvasToggleAbs({ height: false, width: false });
      }

    } /* else if (stackStrategy === 'X') {
      // No need for absolute width anymore
      setCanvasToggleAbs({ height: false, width: false });
    } */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTooNarrow]);


  // is the viewport now wide enough to switch back to the previous model?
  const tooWide = stashedModels.length > 1 ? ((stashedModels[stashedModels.length - 2] as IAnalyzedModel).widthNeeded!) : 9999999999;
  const isTooWide = useMedia(`(min-width: ${tooWide}px`);
  useEffect(() => {

    if (isTooWide) {
      migrateModel(currentModel, stashedModels[stashedModels.length - 2]);
      stashPop();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTooWide]);



  // If too short for current model switch to absolute, 
  /*   const isTooShort = useMedia(`(max-height: ${currentModel.heightNeeded}px)`);
    useEffect(() => {
      if (currentModel) {
        if (!isTooShort) {
          setCanvasToggleAbs({ height: false, width: canvasToggleAbs.width });
        } else {
          setCanvasToggleAbs({ height: true, width: canvasToggleAbs.width });
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTooShort]);
  
   */
  const factory = (node: TabNode) => {
    var component = node.getComponent();
    if (component === "text") {
      return <div dangerouslySetInnerHTML={{ __html: node.getConfig().text }} />
    } else if (component === "pdf") {
      const sMax = {
        height: '99%',
        width: '99%'
      }
      const cont = {
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }
      return <div style={cont}>  <iframe src={node.getConfig().text} style={sMax} /> </div>
    } else if (component === "image") {
      const s = {
        height: '99%',
        width: '99%'
      }
      return <img src={node.getConfig().text} style={s} />
    } else if (component === "123check") {
      const s = {
        width: '1220px',
        height: '1000px'
      }
      return <img src={node.getConfig().text} style={s} />
    }
  }

  /*   const onAdd = (event: any) => {
      (layoutRef.current! as Layout).addTabWithDragAndDropIndirect("Add panel<br>(Drag to location)", {
        component: "text",
        name: "added",
        config: { text: "i was added", minHeight: 300, minWidth: 400 }
      }, undefined);
    }
   */
  const interceptAction = (action: Action) => {

    // when tabs are moved by the user, this can lead to a "divide" whereby a new tabset is created automatically for the tab
    // this new tabset will not have a minimum size and so this needs to be set
    // also for deletion of tabs or addition of nodes, the size may be impacted
    setTimeout(() => {
      stashedModels[stashedModels.length - 1] = analyseModel(currentModel.model, true /* update min sizes if needed*/);
    }, 100);

    return action;
  }

  /*   const changeStrategy = (event: any) => {
      setCanvasToggleAbs({ height: false, width: false });
      setStackStrategy(event.target.value);
    }
   */
  const loadPanels = (event: any) => {
    setMaxPanels(parseInt(event.target.value));
    stashSet([loadTemplateModel(DockLocation.CENTER, parseInt(event.target.value))]);
  }

  const modelChanged = (model: Model) => {
    stashedModels[stashedModels.length - 1] = analyseModel(currentModel.model, false /* avoid infintie loop*/);
  }

  const absStyle = {
    height: canvasToggleAbs.height ? currentModel.heightNeeded + 'px' : '100%',
    width: canvasToggleAbs.width ? currentModel.widthNeeded + 'px' : '100%'
  };


  return (
    <div className="outer" style={absStyle}>
      {/*       <button onClick={onAdd}>Add Panel</button>
      <span> Stacking strategy:</span>
      <select value={stackStrategy} onChange={changeStrategy}>
        <option value="X">X axis</option>
        <option value="Y">Y axis</option>
        <option value="Z">Z axis</option>
      </select>
 */}      <span> Number of Panels:</span>
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
