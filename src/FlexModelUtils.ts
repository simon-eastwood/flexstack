import { Model, TabNode, TabSetNode, Orientation, Actions, Action, Node as FLNode, DockLocation, RowNode } from 'flexlayout-react';



export interface IAnalyzedModel {
    model: Model,
    activeTabset: FLNode | undefined,
    lowestPrioTabset: FLNode | undefined,

    widthNeeded?: number,
    heightNeeded?: number,
    rootRow?: FLNode | undefined
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
        (tabset.getMinWidth() != widthNeeded || tabset.getMinHeight() != heightNeeded)) {
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
    let rootRow = modelToAnalyse.getRoot();


    console.log("Too doing analysis (" + updateIfNeeded);
    // find the tabset that is currently active, and also the first tabset (as fallback)
    modelToAnalyse.visitNodes(node => {

        if (!lowestPrioTabset && node.getType().toLowerCase() === 'tabset') lowestPrioTabset = node as TabSetNode;

        if (!activeTabset && node.getType().toLowerCase() === 'tabset' && (node as TabSetNode).isActive()) {
            activeTabset = node as TabSetNode;
        }

    });

    // call analyze row with root
    const size = analyseRow(rootRow, updateIfNeeded);

    console.log("done");

    const result: IAnalyzedModel = {
        model: modelToAnalyse,
        activeTabset: activeTabset,
        lowestPrioTabset: lowestPrioTabset,
        rootRow,
        widthNeeded: size.widthNeeded,
        heightNeeded: size.heightNeeded
    }

    console.log(modelToAnalyse.toJson());

    console.log(`SIZE : ${size.heightNeeded} x ${size.widthNeeded}`)
    return result;
}


export const cloneModel = (modelToClone: IAnalyzedModel): IAnalyzedModel => {
    let saveCurrentJson = modelToClone.model.toJson();
    let clone = { ...modelToClone };
    clone.model = Model.fromJson(saveCurrentJson);
    return clone;
}

const addIfNotAlreadyIn = (arrayOfNodes: TabNode[], nodeToAdd: TabNode) => {
    if (!arrayOfNodes.find((n) => n.getId() === nodeToAdd.getId())) {
        // add it
        arrayOfNodes.push(nodeToAdd as TabNode);
    }
}

const addSiblings = (arrayOfNodes: TabNode[], node: TabNode) => {
    node.getParent()!.getChildren().forEach((n) => addIfNotAlreadyIn(arrayOfNodes, n as TabNode))
}

export const stackZAxis = (modelToAdapt: IAnalyzedModel, maxPanels: number): IAnalyzedModel | undefined => {

    const m = removeTabset(modelToAdapt.model, DockLocation.CENTER);

    console.log("trimmed tabset");

    return analyseModel(m);
    /*    let targetTabset: FLNode = modelToAdapt.activeTabset ? modelToAdapt.activeTabset : modelToAdapt.lowestPrioTabset!;
       let tabsToMove: TabNode[] = [];
   
       let success = false;
   
   
       modelToAdapt.model.visitNodes((node) => {
           if (node.getType().toLowerCase() === 'tab' && node.getParent()?.getId() !== targetTabset!.getId() && tabsToMove.length === 0) {
               // add this node and any siblings it has
               addSiblings(tabsToMove, node as TabNode);
           }
       });
   
       tabsToMove.forEach(node => {
           let mv = Actions.moveNode(node.getId(), targetTabset?.getId(), DockLocation.CENTER, -1, false);
           modelToAdapt.model.doAction(mv);
           success = true;
       })
   
       if (success) {
           return analyseModel(modelToAdapt.model);;
       } else {
           return undefined;
       }
    */
}

export const stackYAxis = (modelToAdapt: IAnalyzedModel): IAnalyzedModel | undefined => {
    let activeTabset: FLNode = modelToAdapt.activeTabset ? modelToAdapt.activeTabset : modelToAdapt.lowestPrioTabset!;
    let targetRow = modelToAdapt.rootRow;
    let tabSetsToMove: FLNode[] = [];

    let success = false;

    if (targetRow) {

        modelToAdapt.model.visitNodes((node) => {
            console.log(node.getType() + " is " + node.getId());
            if (node.getType().toLowerCase() === 'tabset' && node.getId() !== activeTabset.getId() && tabSetsToMove.length === 0) {
                tabSetsToMove.push(node);
            }
        });


        tabSetsToMove.forEach(node => {
            let mv = Actions.moveNode(node.getId(), targetRow!.getId(), DockLocation.BOTTOM, -1);

            modelToAdapt.model.doAction(mv);
            success = true;

            // targetRow = node.getParent();
        })

    }

    if (success) {
        return analyseModel(modelToAdapt.model);;
    } else {
        return undefined;
    }
}

export const migrateModel = (sourceModel: IAnalyzedModel, targetModel: IAnalyzedModel) => {
    let actions: Action[] = [];
    let lastTabSet: TabSetNode;
    console.log("migrating model");

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


// 1. find the tabsets within the model and put them into a map based on their panel number
// 2. for each panel, if its panel id is larger than max panel then it needs to be deleted but not before...
// 3. ...moving its children to their preferred destination specified in panelPreferenceOrder.
// The ids in this list are checked one-by-one until one is found that is "small enough" that that panel stills exists.
// The child nodes are then moved to their new preferred / available panel
export const removeTabset = (model: Model, dockLocation: DockLocation, maxPanelNr?: number): Model => {
    let maxPanel = -1;
    const panels = new Map<number, TabSetNode>();

    model.visitNodes((node) => {
        if (node.getType() === 'tabset' && (node as TabSetNode).getConfig().panel) {
            const ts = node as TabSetNode;
            const panelNr = ts.getConfig().panel;
            panels.set(panelNr, ts);
            maxPanel = (panelNr > maxPanel) ? panelNr : maxPanel;
        }
    });

    maxPanel = (maxPanelNr) ? maxPanelNr : maxPanel;

    if (panels.size > 0) {
        // if there are tabsets in the model marked with a panel id then use this to decide which one to delete
        panels.forEach((ts, panelNr) => {
            if (panelNr >= maxPanel) {
                // move the children
                const childrenToMove = new Map<TabNode, TabSetNode>();
                ts.getChildren().forEach((child) => {
                    let destinationId = -1;
                    if (child.getType() === 'tab' && (child as TabNode).getConfig().panelPreferenceOrder) {
                        // find the prefered destination by looking through the pref order list until a small-enough number is found
                        destinationId = ((child as TabNode).getConfig().panelPreferenceOrder as Array<number>).reduce((previousPreference, currentValue) => {
                            if (previousPreference < maxPanel) {
                                return previousPreference;
                            }
                            return currentValue;
                        });
                    }
                    // if cant find preferred desination, just take fist one
                    if (destinationId === -1) {
                        const ps = Array.from(panels.keys());
                        destinationId = ps[0];
                    }
                    childrenToMove.set(child as TabNode, panels.get(destinationId)!);

                })

                childrenToMove.forEach((dest, child) => {
                    let mv = Actions.moveNode(child.getId(), dest.getId(), DockLocation.CENTER, -1, false);
                    model.doAction(mv);
                }
                )


                // delete the tabset
                let del = Actions.deleteTabset(ts.getId());
                // model.doAction(del);
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
    return model;
}

