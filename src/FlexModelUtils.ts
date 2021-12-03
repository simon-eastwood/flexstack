import { Model, TabNode, TabSetNode, Orientation, Actions, Action, Node as FLNode, DockLocation, RowNode } from 'flexlayout-react';



export interface IAnalyzedModel {
    model: Model,
    activeTabset: FLNode | undefined,
    prioTabset: FLNode | undefined,
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
    if (updateIfNeeded && (heightNeeded > 0 || widthNeeded > 0)) {
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

    let prioTabset: TabSetNode | undefined = undefined;
    let activeTabset: TabSetNode | undefined = undefined;
    let rootRow = modelToAnalyse.getRoot();


    console.log("Too doing analysis");
    // find the tabset that is currently active, and also the first tabset (as fallback)
    modelToAnalyse.visitNodes(node => {

        if (!prioTabset && node.getType().toLowerCase() === 'tabset') prioTabset = node as TabSetNode;

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
        prioTabset: prioTabset,
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

export const stackZAxis = (modelToAdapt: IAnalyzedModel): IAnalyzedModel | undefined => {
    let targetTabset: FLNode = modelToAdapt.activeTabset ? modelToAdapt.activeTabset : modelToAdapt.prioTabset!;
    let tabsToMove: FLNode[] = [];

    let success = false;


    modelToAdapt.model.visitNodes((node) => {
        console.log(node.getType() + " is " + node.getId());
        if (node.getParent()) {
            console.log(" and parent is: " + node!.getParent()!.getId());

        } else {
            console.log("none")
        }
        if (node.getType().toLowerCase() === 'tab' && node.getParent()?.getId() !== targetTabset!.getId()) {
            tabsToMove.push(node);
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

}

export const stackYAxis = (modelToAdapt: IAnalyzedModel): IAnalyzedModel | undefined => {
    let activeTabset: FLNode = modelToAdapt.activeTabset ? modelToAdapt.activeTabset : modelToAdapt.prioTabset!;
    let targetRow = modelToAdapt.rootRow;
    let tabSetsToMove: FLNode[] = [];

    let success = false;

    if (targetRow) {

        modelToAdapt.model.visitNodes((node) => {
            console.log(node.getType() + " is " + node.getId());
            if (node.getType().toLowerCase() === 'tabset' && node.getId() !== activeTabset.getId()) {
                tabSetsToMove.push(node);
            }
        });


        tabSetsToMove.forEach(node => {
            let mv = Actions.moveNode(node.getId(), targetRow!.getId(), DockLocation.BOTTOM, -1);

            console.log(mv);

            console.log("before parent IS " + node.getParent()!.getId())
            console.log("node is "); console.log(node.toJson());
            modelToAdapt.model.doAction(mv);
            success = true;


            // targetRow = node.getParent();
            console.log("after parent IS " + node.getParent()!.getId())

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


