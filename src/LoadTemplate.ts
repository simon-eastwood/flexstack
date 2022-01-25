import { Model, IJsonModel, Node as FLNode, DockLocation } from 'flexlayout-react';

import { analyseModel, removeTabset, moveTabset } from './FlexModelUtils';



var taskTemplateLayout: { name: string, model: IJsonModel } = {
    name: 'task1',
    model: {
        global: {
            "rootOrientationVertical": false,
            "tabSetEnableDivide": false, // it keeps things simpler for moving tabs if all tabsets are labelled with a panel nr
            "enableEdgeDock": false // otherwise the user can create new tabsets by dragging into the edge
        }, // {tabSetEnableTabStrip:false}, // to have just splitters
        layout: {
            "type": "row",
            "weight": 100,
            "children": [
                {
                    "type": "tabset",
                    "weight": 50,
                    "selected": 0,
                    "config": {
                        "panel": 1
                    },
                    "children": [
                        {
                            "type": "tab",
                            "name": "Comm",
                            "component": "text",
                            "config": {
                                "text": "Comm",
                                "minWidth": 510,
                                "minHeight": 350,
                                "panelPreferences": [1.1,1.1,1.1,1.1,1.1]
                            }
                        }
                    ]
                },
                {
                    "type": "tabset",
                    "weight": 50,
                    "selected": 0,
                    "config": {
                        "panel": 2
                    },
                    "children": [
                        {
                            "type": "tab",
                            "name": "Letter",
                            "component": "text",
                            "config": {
                                "text": "Letter",
                                "minWidth": 510,
                                "minHeight": 350,
                                "panelPreferences": [-1.3, -1.3, 2.1, 2.1, 2.1]
                            }
                        }
                    ]
                },
                {
                    "type": "tabset",
                    "weight": 50,
                    "selected": 0,
                    "config": {
                        "panel": 3
                    },
                    "children": [
                        {
                            "type": "tab",
                            "name": "Claims",
                            "component": "text",
                            "config": {
                                "text": "Claims",
                                "minWidth": 510,
                                "minHeight": 350,
                                "panelPreferences": [-1.4,-2.2,-3.2,3.1,3.1]
                            }
                        }
                    ]
                },

                {
                    "type": "tabset",
                    "weight": 50,
                    "selected": 0,
                    "config": {
                        "panel": 4
                    },
                    "children": [
                        {
                            "type": "tab",
                            "name": "Fig",
                            "component": "text",
                            "config": {
                                "text": "Fig",
                                "minWidth": 510,
                                "minHeight": 350,
                                "panelPreferences": [-1.2,-1.2,-1.2,-1.2,4.1]
                            }
                        }
                    ]
                },
                {
                    "type": "tabset",
                    "weight": 50,
                    "selected": 0,
                    "config": {
                        "panel": 5
                    },
                    "children": [
                        {
                            "type": "tab",
                            "name": "AppAn",
                            "component": "text",
                            "config": {
                                "text": "AppAn",
                                "minWidth": 510,
                                "minHeight": 350,
                                "panelPreferences": [-1.5,2.1, 3.1, 4.1, 5.1]
                            }
                        }
                    ]
                }
            ]
        }
    }
};



// if maxPanel is undefined, return the canonical model (or in future the user's saved model if there is one, and the canonical model failing that)
// if maxPanel is defined, transform the model 
export const loadTemplateModel = (howToStack: DockLocation, maxPanel?: number,) => {
    let model = Model.fromJson(taskTemplateLayout.model as IJsonModel);

    if (maxPanel) {
        if (howToStack === DockLocation.BOTTOM) {
            model = moveTabset(model);
        } else {
            model = removeTabset(model, maxPanel + 1);
        }
    }
    const templateModel = analyseModel(model, true);

    return templateModel;
}