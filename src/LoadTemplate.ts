import { Layout, Model, TabNode, TabSetNode, IJsonModel, Action, Actions, Node as FLNode, DockLocation } from 'flexlayout-react';

import { analyseModel, stackZAxis, IAnalyzedModel, stackYAxis, migrateModel, cloneModel, removeTabset } from './FlexModelUtils';



var taskTemplateLayout: { name: string, model: IJsonModel } = {
    name: 'task1',
    model: {
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
                    "config": {
                        "panel": 1
                    },
                    "children": [
                        {
                            "type": "tab",
                            "name": "One",
                            "component": "text",
                            "config": {
                                "text": "<ul><li>drag tabs</li><li>drag splitters</li><li>double click on tab to rename</li><li>double click on tabstrip to maximize</li><li>use the Add button to add another tab</li></ul>",
                                "minWidth": 510,
                                "minHeight": 350,
                                "panelPreferenceOrder": [1]
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
                            "name": "three",
                            "component": "text",
                            "config": {
                                "text": "this is tab three",
                                "minWidth": 510,
                                "minHeight": 350,
                                "panelPreferenceOrder": [3, 2, 1]
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
                            "name": "two",
                            "component": "text",
                            "config": {
                                "text": "this is tab two",
                                "minWidth": 510,
                                "minHeight": 350,
                                "panelPreferenceOrder": [2, 1]
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
                            "name": "four",
                            "component": "text",
                            "config": {
                                "text": "this is tab four",
                                "minWidth": 510,
                                "minHeight": 350,
                                "panelPreferenceOrder": [4, 3, 2, 1]
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
                            "name": "five",
                            "component": "text",
                            "config": {
                                "text": "this is tab five",
                                "minWidth": 510,
                                "minHeight": 350,
                                "panelPreferenceOrder": [5, 4, 3, 2, 1]
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
        model = removeTabset(model, howToStack, maxPanel);
    }
    const templateModel = analyseModel(model, true);

    return templateModel;
}