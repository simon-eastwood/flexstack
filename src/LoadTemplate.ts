import { Model, IJsonModel, DockLocation } from 'flexlayout-react';

import { analyseModel, removeTabset, moveTabset } from './FlexModelUtils';



var taskTemplateLayout: { name: string, model: IJsonModel } = {
    name: 'task1',
    model: {
        global: {
            "rootOrientationVertical": false,
            "tabSetEnableDivide": false, // it keeps things simpler for moving tabs if all tabsets are labelled with a panel nr
            "enableEdgeDock": false, // otherwise the user can create new tabsets by dragging into the edge
            "tabEnableClose": false
        }, // {tabSetEnableTabStrip:false}, // to have just splitters
        layout: {
            "type": "row",

            "children": [
                {
                    "type": "tabset",
                    "selected": 0,
                    "children": [
                        {
                            "type": "tab",
                            "name": "Comm",
                            "component": "iframe",
                            "enableClose": false,
                            "config": {
                                "text": "https://www.ibm.com/downloads/cas/GB8ZMQZ3",
                                "minWidth": 50,
                                "minHeight": 350,
                                "panelPreferences": [1.1, 1.1, 1.1, 1.1, 1.1]
                            }
                        }
                    ]
                },
                {
                    "type": "tabset",
                    "selected": 0,
                    "children": [
                        {
                            "type": "tab",
                            "name": "Letter",
                            "component": "iframe",
                            "enableClose": false,
                            "config": {
                                "text": "https://ai.stanford.edu/~nilsson/MLBOOK.pdf",
                                "minWidth": 50,
                                "minHeight": 350,
                                "panelPreferences": [-1.3, -1.3, 2.1, 2.1, 2.1]
                            }
                        }
                    ]
                },
                {
                    "type": "tabset",
                    "selected": 0,
                    "children": [
                        {
                            "type": "tab",
                            "name": "Claims",
                            "component": "iframe",
                            "enableClose": false,
                            "config": {
                                "text": "https://patentimages.storage.googleapis.com/68/80/73/6a17a66e9ec8c5/US11107588.pdf",
                                "minWidth": 50,
                                "minHeight": 350,
                                "panelPreferences": [-1.4, -2.2, -3.2, 3.1, 3.1]
                            }
                        }
                    ]
                },

                {
                    "type": "tabset",
                    "selected": 0,
                    "children": [
                        {
                            "type": "tab",
                            "name": "Fig",
                            "component": "image",
                            "enableClose": false,
                            "config": {
                                "text": "https://patentimages.storage.googleapis.com/US20060145019A1/US20060145019A1-20060706-D00000.png",
                                "minWidth": 350,
                                "minHeight": 350,
                                "panelPreferences": [-1.2, -1.2, -1.2, -1.2, 4.1]
                            }
                        }
                    ]
                },
                {
                    "type": "tabset",
                    "selected": 0,
                    "children": [
                        {
                            "type": "tab",
                            "name": "AppAn",
                            "component": "123check",
                            "enableClose": false,
                            "config": {
                                "text": "/flexstack/123Check_only.png",
                                "minWidth": 1252,
                                "minHeight": 350,
                                "panelPreferences": [-1.5, 2.1, 3.1, 4.1, 5.1]
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
    const templateModel = analyseModel(model);

    return templateModel;
}