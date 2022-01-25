import { Model, TabNode, TabSetNode, Orientation, Actions, Action, Node as FLNode, DockLocation, RowNode } from 'flexlayout-react';



export interface IAnalyzedModel {
    model: Model,
    activeTabset: FLNode | undefined,
    widthNeeded?: number,
    heightNeeded?: number
}

interface IDimensions {
    widthNeeded: number,
    heightNeeded: number,
}


const getTabSetMinSize = (tabset: TabSetNode, updateIfNeeded: boolean): IDimensions => {
    let heightNeeded = 0;
    let widthNeeded = 0;

    // iterate through the tabs to get min sizes
    tabset.getChildren().forEach(node => {
        if (node.getType() !== TabNode.TYPE) {
            throw Error("tabset has a child which is not a tab - this is not expected")
        }

        const t = node as TabNode;
        heightNeeded = Math.max(heightNeeded, t.getConfig().minHeight);
        widthNeeded = Math.max(widthNeeded, t.getConfig().minWidth);

    })

    // to avoid infinite loops, updates cannot be done on model updates
    if ((updateIfNeeded && (heightNeeded > 0 || widthNeeded > 0)) &&
        (tabset.getMinWidth() !== widthNeeded || tabset.getMinHeight() !== heightNeeded)) {
        // only modify if different because this causes a model update which again causes analyse
        const setSize = Actions.updateNodeAttributes(tabset.getId(), { minWidth: widthNeeded, minHeight: heightNeeded });
        tabset.getModel().doAction(setSize);
    }

    return {
        widthNeeded,
        heightNeeded
    }

}

const analyseRow = (row: RowNode, updateIfNeeded: boolean): IDimensions => {
    let widthNeeded = 0;
    let heightNeeded = 0;

    row.getChildren().forEach(node => {
        if (node.getType() === TabSetNode.TYPE) {
            const ts = getTabSetMinSize(node as TabSetNode, updateIfNeeded);
            if (row.getOrientation() === Orientation.HORZ) {
                widthNeeded += ts.widthNeeded;
                heightNeeded = Math.max(heightNeeded, ts.heightNeeded);
            } else {
                widthNeeded = Math.max(widthNeeded, ts.widthNeeded);
                heightNeeded += ts.heightNeeded;
            }
        } else if (node.getType() === RowNode.TYPE) {
            // recurse for child row
            const size = analyseRow(node as RowNode, updateIfNeeded);
            if (row.getOrientation() === Orientation.HORZ) {
                if (size.widthNeeded) widthNeeded += size.widthNeeded;
                if (size.heightNeeded) heightNeeded = Math.max(heightNeeded, size.heightNeeded);
            } else {
                if (size.widthNeeded) widthNeeded = Math.max(widthNeeded, size.widthNeeded);
                if (size.heightNeeded) heightNeeded += size.heightNeeded;
            }
        }
    })


    return {
        widthNeeded,
        heightNeeded
    }
}

export const analyseModel = (modelToAnalyse: Model, updateIfNeeded: boolean = false): IAnalyzedModel => {

    let lowestPrioTabset: TabSetNode | undefined = undefined;
    let activeTabset: TabSetNode | undefined = undefined;


    // find the tabset that is currently active, and also the first tabset (as fallback)
    modelToAnalyse.visitNodes(node => {

        if (!lowestPrioTabset && node.getType().toLowerCase() === 'tabset') lowestPrioTabset = node as TabSetNode;

        if (!activeTabset && node.getType().toLowerCase() === 'tabset' && (node as TabSetNode).isActive()) {
            activeTabset = node as TabSetNode;
        }

    });

    // call analyze row with root
    const size = analyseRow(modelToAnalyse.getRoot(), updateIfNeeded);

    const result: IAnalyzedModel = {
        model: modelToAnalyse,
        activeTabset: activeTabset,
        widthNeeded: size.widthNeeded,
        heightNeeded: size.heightNeeded
    }

    return result;
}


export const cloneModel = (modelToClone: IAnalyzedModel): IAnalyzedModel => {
    let saveCurrentJson = modelToClone.model.toJson();
    let clone = { ...modelToClone };
    clone.model = Model.fromJson(saveCurrentJson);
    return clone;
}



export const migrateModel = (sourceModel: IAnalyzedModel, targetModel: IAnalyzedModel) => {
    let actions: Action[] = [];
    let lastTabSet: TabSetNode;
    console.log("migrating model"); console.log(sourceModel); console.log(targetModel);

    // Which nodes need to be deleted from target?
    targetModel.model.visitNodes((node) => {
        if (node.getType() === TabNode.TYPE) {
            if (!sourceModel.model.getNodeById(node.getId())) {
                actions.push(Actions.deleteTab(node.getId()));
            }
        } else if (node.getType() === TabSetNode.TYPE) {
            lastTabSet = node as TabSetNode;
        }
    })

    // which nodes need to added to the target?
    sourceModel.model.visitNodes((node) => {
        if (node.getType() === TabNode.TYPE) {
            if (!targetModel.model.getNodeById(node.getId())) {
                // add to the same parent if possible
                const parent = node.getParent();
                if (parent!.getType() === TabSetNode.TYPE && targetModel.model.getNodeById(parent!.getId())) {
                    actions.push(Actions.addNode(node.toJson(), parent!.getId(), DockLocation.CENTER, -1, false));
                } else {
                    // Otherwise add to the last tabset in the model
                    if (lastTabSet) {
                        actions.push(Actions.addNode(node.toJson(), lastTabSet.getId(), DockLocation.CENTER, -1, false));
                    } else {
                        actions.push(Actions.addNode(node.toJson(), targetModel.model.getRoot().getId(), DockLocation.RIGHT, -1, false));
                    }
                }

            }
        }
    });

    actions.forEach(action => {
        targetModel.model.doAction(action);
    });
}

export const moveTabset = (model: Model): Model => {
    let maxPanel = -1;
    const panels = new Map<number, TabSetNode>();
    let totalNrOfTabSets = 0;

    model.visitNodes((node) => {
        if (node.getType() === 'tabset') {
            totalNrOfTabSets++;
            if ((node as TabSetNode).getConfig()?.panel) {
                const ts = node as TabSetNode;
                const panelNr = ts.getConfig().panel;
                panels.set(panelNr, ts);
                maxPanel = (panelNr > maxPanel) ? panelNr : maxPanel;
            }
        }
    });

    if (totalNrOfTabSets < 2) {
        // can't move the  last tabset, so bail out here
        return model;
    }

    if (panels.size > 0) {
        let mv = Actions.moveNode(panels.get(maxPanel)!.getId(), model.getRoot().getId() ,DockLocation.BOTTOM, -1, false);
        model.doAction(mv);   
    }

    return model;
}


// 1. find the tabsets within the model and put them into a map based on their panel number
// 2. for each panel, if its panel id is larger than max panel then it needs to be deleted but not before...
// 3. ...moving its children to their preferred destination specified in panelPreferences.
// The child nodes are then moved to their new preferred / available panel
export const removeTabset = (model: Model, maxPanelNr?: number): Model => {
    let maxPanel = -1;
    const panels = new Map<number, TabSetNode>();
    let totalNrOfTabSets = 0;

  
    // first find out how many tabsets there are in the model and collect the ones with a "panel" number. Record max panel nr found
    model.visitNodes((node) => {
        if (node.getType() === 'tabset') {
            totalNrOfTabSets++;
            if ((node as TabSetNode).getConfig()?.panel) {
                const ts = node as TabSetNode;
                const panelNr = ts.getConfig().panel;
                panels.set(panelNr, ts);
                maxPanel = (panelNr > maxPanel) ? panelNr : maxPanel;
            }
        }
    });
    maxPanel = (maxPanelNr) ? maxPanelNr : maxPanel;

    if (totalNrOfTabSets < 2) {
        // don't want to delete the last tabset, so bail out here
        return model;
    }

    // Now delete all tabsets labeled with a panelId >= maxPanel
    // if this function is called without a maxPanelNr then that's just the last panel (e.g. 5)
    // if this function is called with a maxPanelNr (cos we're loading a template and the user only wants e.g. 2 panels) then that could be more than 1
    if (panels.size > 0) {
        // if there are tabsets in the model marked with a panel id then use this to decide which one to delete
        panels.forEach((ts, panelNr) => {
            if (panelNr >= maxPanel) {
                // move the children
                const childrenToMove = new Map<TabNode, Destination>();
                ts.getChildren().forEach((child) => {
                    if (child.getType() === 'tab') {
                        const tab = child as TabNode;
                        childrenToMove.set(tab, tabToDestination(tab, maxPanel - 1));
                    }
                })

                childrenToMove.forEach((dest, child) => {
                    let p = panels.get(dest.destMajor);
                    let mv;
                     if (p) {
                         mv = Actions.moveNode(child.getId(), p!.getId(), DockLocation.CENTER, dest.destMinor - 1, (dest.destPref? dest.destPref > 0: false) /* +ve = selected */);
                     } else {
                         // got to move it somewhere....then to root
                        mv = Actions.moveNode(child.getId(), model.getRoot().getId(), DockLocation.CENTER, - 1, false);
                    }
                    model.doAction(mv);
                })


                // delete the tabset. Actually an empty tabset will not be rendered
                // but this will confuse the task of finding next tab to remove
                // so better to clean up
                let del = Actions.deleteTabset(ts.getId());
                model.doAction(del);
            }
        })
    } else {
        let done = false;
        // no tabsets in the model have config.panel set so just delete the first one that isnt active
        model.visitNodes((node) => {
            if (!done && node.getType() === 'tabset' && !(node as TabSetNode).isActive()) {
                let del = Actions.deleteTabset(node.getId());
                model.doAction(del);
                done = true;
            }
        });
    }

    // With less tabsets, some other tabs might prefer to be moved
    reorderTabs(model);
    console.log("done removing tabset");
    return model;
}

// move tabs if necessary so that they are all on their preferred panel, in the preferred order
const reorderTabs = (model: Model) => {
    let maxPanel = -1;
    const panels = new Map<number, TabSetNode>();

    // first find out how many tabsets there are in the model and collect the ones with a "panel" number. Record max panel nr found
    model.visitNodes((node) => {
        if (node.getType() === 'tabset') {
            if ((node as TabSetNode).getConfig()?.panel) {
                const ts = node as TabSetNode;
                const panelNr = ts.getConfig().panel;
                panels.set(panelNr, ts);
                maxPanel = (panelNr > maxPanel) ? panelNr : maxPanel;
            } 
        }
    });


    // Now iterate through the tabs and see where to move them
    const tabsToMove = new Map<TabNode, Destination>();
    model.visitNodes((node) => {
        if (node.getType() === 'tab') {
            tabsToMove.set(node as TabNode, tabToDestination(node as TabNode, maxPanel));
        }
    });


    // now do the moves
    tabsToMove.forEach((dest, tab) => {
        let mv;

        if (dest.destMajor !== 0) {
            let p = panels.get(dest.destMajor);
            console.log ("max panel is " + maxPanel + " and " + p + " derived from " + dest + " for " + tab.getName() + " destMahor " + dest.destMajor + " in " + panels)
            // tabOrder is the number after the decimal point
            if (p) {
                mv = Actions.moveNode(tab.getId(), p!.getId(), DockLocation.CENTER, dest.destMinor - 1, (dest.destPref? dest.destPref > 0: false) /* +ve = selected */);
                model.doAction(mv);
            }
        }
            
    })


}


// use tab config to see, for the given max panel, where the tab should go
type Destination = {
    destPref: number|undefined , // the original config value (can be negative or undefined)
    destMajor: number, // 0 means unknown destination
    destMinor: number
}
const tabToDestination = (tab: TabNode, maxPanel: number = 5):Destination =>  {
    let destPref;
    
     if (tab.getConfig()?.panelPreferences?.length >= maxPanel) { 
        destPref = tab.getConfig().panelPreferences[maxPanel - 1];
        const destMajor = Math.floor(Math.abs(destPref));
        const destMinor = Math.round((Math.abs(destPref) === destMajor) ? 0 : (Math.abs(destPref) - destMajor) * 10);

         return {
            destPref,
            destMajor,
            destMinor
        } 
    } else {
         return {
             destPref,
             destMajor: 0,
             destMinor: -1
        }
    }
    
}