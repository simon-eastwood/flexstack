import { Model, TabNode, TabSetNode, IJsonModel, Action, Actions, Node as FLNode, DockLocation, RowNode } from 'flexlayout-react';



export interface IAnalyzedModel {
    name?: string,
    model: Model,
    activeTabset: FLNode | undefined,
    prioTabset: FLNode | undefined,
    widthNeeded?: number,
    heightNeeded?: number,
    rootRow?: FLNode | undefined
}

export const analyseModel = (modelToAnalyse: Model, name?: string): IAnalyzedModel => {

    let prioTabset: TabSetNode | undefined = undefined;
    let activeTabset: TabSetNode | undefined = undefined;
    let row: RowNode | undefined = undefined;
    let widthNeeded = 0;
    let heightNeeded = 0;


    console.log("doign analysis");
    // find the tabset that is currently active, and also the first tabset (as fallback)
    modelToAnalyse.visitNodes(node => {
        console.log(node.getType() + " is " + node.getId());
        if (node.getChildren()) {
            console.log("has children");
            node.getChildren().forEach(node => console.log("  " + node.getId() + ","))
        } else console.log("has NO children");

        if (node.getParent()) {
            console.log("has parent " + node.getParent()!.getId());
        } else console.log("has NO parent");



        if (!prioTabset && node.getType().toLowerCase() === 'tabset') prioTabset = node as TabSetNode;

        if (!activeTabset && node.getType().toLowerCase() === 'tabset' && (node as TabSetNode).isActive()) {
            activeTabset = node as TabSetNode;
        }

        if (!row && node.getType().toLowerCase() === 'row' && !node.getParent()) {
            row = node as RowNode;
        }

        if (node.getType().toLowerCase() === 'tabset') {
            if ((node as TabSetNode).getMinWidth() > 0) {
                widthNeeded += (node as TabSetNode).getMinWidth();

            }
            if ((node as TabSetNode).getMinHeight() > 0) {
                heightNeeded += (node as TabSetNode).getMinHeight();

            }
        }
    });
    console.log("done");

    const result: IAnalyzedModel = {
        name: name,
        model: modelToAnalyse,
        activeTabset: activeTabset,
        prioTabset: prioTabset,
        rootRow: row
    }

    console.log(modelToAnalyse.toJson());
    if (widthNeeded > 0) result.widthNeeded = widthNeeded; console.log("min width = "); console.log(widthNeeded);
    if (heightNeeded > 0) result.heightNeeded = heightNeeded; console.log("min height = "); console.log(heightNeeded);

    return result;
}



export const stackZAxis = (analyzedModel: IAnalyzedModel): IAnalyzedModel => {

    let targetTabset: FLNode = analyzedModel.activeTabset ? analyzedModel.activeTabset : analyzedModel.prioTabset!;
    let tabsToMove: FLNode[] = [];

    analyzedModel.model.visitNodes((node) => {
        console.log(node.getType() + " is " + node.getId());
        if (node.getParent()) {
            console.log(" and parent is: " + node!.getParent()!.getId());

        } else {
            console.log("none")
        }
        if (node.getType().toLowerCase() === 'tab' && node.getParent()?.getId() != targetTabset!.getId()) {
            tabsToMove.push(node);
        }
    });

    tabsToMove.forEach(node => {
        let mv = Actions.moveNode(node.getId(), targetTabset?.getId(), DockLocation.CENTER, -1, false);
        analyzedModel.model.doAction(mv);
    })


    return analyseModel(analyzedModel.model);
}

export const stackYAxis = (analyzedModel: IAnalyzedModel): IAnalyzedModel => {
    let activeTabset: FLNode = analyzedModel.activeTabset ? analyzedModel.activeTabset : analyzedModel.prioTabset!;
    let targetRow = analyzedModel.rootRow;
    let tabSetsToMove: FLNode[] = [];

    if (targetRow) {

        analyzedModel.model.visitNodes((node) => {
            console.log(node.getType() + " is " + node.getId());
            if (node.getType().toLowerCase() === 'tabset' && node.getId() != activeTabset.getId()) {
                tabSetsToMove.push(node);
            }
        });


        tabSetsToMove.forEach(node => {
            let mv = Actions.moveNode(node.getId(), targetRow!.getId(), DockLocation.BOTTOM, -1);
            console.log(mv);

            console.log("before parent IS " + node.getParent()!.getId())
            console.log("node is "); console.log(node.toJson());
            analyzedModel.model.doAction(mv);

            // targetRow = node.getParent();
            console.log("after parent IS " + node.getParent()!.getId())



        })

    }

    return analyseModel(analyzedModel.model);
}
