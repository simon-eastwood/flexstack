import { Model, TabNode, TabSetNode, IJsonModel, Action, Orientation, Actions, Node as FLNode, DockLocation, RowNode } from 'flexlayout-react';



export interface IAnalyzedModel {
    name?: string,
    model: Model,
    activeTabset: FLNode | undefined,
    prioTabset: FLNode | undefined,
    widthNeeded?: number,
    heightNeeded?: number,
    rootRow?: FLNode | undefined
}

interface IDimensions {
    widthNeeded?: number,
    heightNeeded?: number,
}
const analyseRow = (row: RowNode): IDimensions => {
    let widthNeeded = 0;
    let heightNeeded = 0;

    row.getChildren().forEach(node => {
        if (node.getType() === TabSetNode.TYPE) {
            const ts = node as TabSetNode;
            if (row.getOrientation() === Orientation.HORZ) {
                widthNeeded += ts.getMinWidth();
                heightNeeded = Math.max(heightNeeded, ts.getMinHeight());
            } else {
                widthNeeded = Math.max(widthNeeded, ts.getMinWidth());
                heightNeeded += ts.getMinHeight();
            }
        } else if (node.getType() === RowNode.TYPE) {
            // recurse for child row
            const size = analyseRow(node as RowNode);
            if (row.getOrientation() === Orientation.HORZ) {
                if (size.widthNeeded) widthNeeded += size.widthNeeded;
                if (size.heightNeeded) heightNeeded = Math.max(heightNeeded, size.heightNeeded);
            } else {
                if (size.widthNeeded) widthNeeded = Math.max(widthNeeded, size.widthNeeded);
                if (size.heightNeeded) heightNeeded += size.heightNeeded;
            }
        }
    })

    return { widthNeeded, heightNeeded }
}

export const analyseModel = (modelToAnalyse: Model, name?: string): IAnalyzedModel => {

    let prioTabset: TabSetNode | undefined = undefined;
    let activeTabset: TabSetNode | undefined = undefined;
    let rootRow = modelToAnalyse.getRoot();


    console.log("doign analysis");
    // find the tabset that is currently active, and also the first tabset (as fallback)
    modelToAnalyse.visitNodes(node => {

        if (!prioTabset && node.getType().toLowerCase() === 'tabset') prioTabset = node as TabSetNode;

        if (!activeTabset && node.getType().toLowerCase() === 'tabset' && (node as TabSetNode).isActive()) {
            activeTabset = node as TabSetNode;
        }

    });

    // call analyze row with root
    const size = analyseRow(rootRow);

    console.log("done");

    const result: IAnalyzedModel = {
        name: name,
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

