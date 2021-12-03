
#Overview
Starts with a template which is loaded initially. The user can then move / add / delete tabs and this is the "current model" as seen on screen.
Each time the model changes, a calculation is done of the min height / width needed for the full layout based on the minheight and minwidth attributes in the configJSON of the individual tabs. For the Flexlayout library, minwidth / minheight are attributes of the Tabset not the individual tabs, but knowing per tab sizes allows us to "migrate" them to other tabsets when they are moved. The tabset sizes are the MAX of the child tabs. So if I move a big tab to another tabset this can mean that the target tabset needs to get a bigger min size and the source tabset can have a smaller minheight / width.
A media query is set to detect when the viewport is too narrow for the current model (this width is updated on model changes). When this happens, the stacking strategy is run to create a new model which is adapted somehow to be less wide. The previous model is stored and the new model is applied as "current".
A media query is also set to detect when the viewer is wide enough again to go back to the previous model in the stack. When this occurs, the current model (which was created automatically) is popped from the stack and any new / deleted tabs are applied to the previous model. The previous model is now "current" again.

As this is a stack it is possible use progressive algorithms and so have 3 or more layout models in the stack with steadily smaller widths and use media queries to switch between them.

#Todos
- The algorithm for migrating newly added tabs from one model to another sometimes produces undesirable results (puts the new tabs in an "odd" place in the other layout).
- When tabs are added by the user and there are so many new ones that it triggers a stacking action, there seems to be an unnecessary number of loops through the analysis and model change methods. Could be made more efificient.
- Implement a "progressive Z axis" strategy whereby only the right-most tabset is moved each time.

Need to consider whether this approach of storing previous models when running auto-stack is the right way to go. Alternatives would be 
a) an empty, pre-cooked skeleton layout template for smaller screensizes and algorthm for what to move where or 
b) use an automated algorithm to make use of extra space again instead of reverting back to the previous layout. A bit like the windows "arrange icons" function. Perhaps this should be manually invoked by the user instead of automatically applied once the viewport has the previous width.
