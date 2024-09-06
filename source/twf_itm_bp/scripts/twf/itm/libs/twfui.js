import * as mc from "@minecraft/server";
import * as mcui from "@minecraft/server-ui";


// @TheWorldFoundry

/*
	2024-06-03 Initial - Item editor
*/


/*  FORMS LAYOUT AND LOGIC */
const FORMS_CACHABLE_KEY = 'cache';
const FORMS_TYPE_BUTTONS = 'buttons';
const FORMS_TYPE_CONTROLS = 'controls';
const FORMS_TYPE_YESNO = 'yesno';
const FORMS_START_KEY = 'start';
const FORMS_TYPE_KEY = 'type';
const FORMS_TITLE_KEY = 'title';
const FORMS_BODY_KEY = 'body';
const FORMS_NAVIGATE_KEY = 'nav';
const FORMS_RUN_AFTER_KEY = 'run_after';
const FORMS_CONTROLS_KEY = 'controls';
const FORMS_CONTROL_BOOL = 'bool';
const FORMS_CONTROL_SLIDER = 'slider';
const FORMS_CONTROL_SELECT = 'select';
const FORMS_CONTROL_INPUT = 'input';
const FORMS_CONTROL_SCOPE_PLAYER = 'player';
const FORMS_CONTROL_SCOPE_GLOBAL = 'global';

/*  FORMS DISPLAY AND NAVIGATION HANDLING */


const show_forms_on_item_use = ({ itemTypeId, forms_control, project_global_settings, sound_open, sound_flag, item_top_up, item_top_up_flag }) => {
    mc.world.afterEvents.itemUse.subscribe(async (event) => {
		const { source: player, itemStack } = event;
        if (itemStack.typeId === itemTypeId) {
			if(project_global_settings["DEBUG"]) player.sendMessage('show_forms_on_item_use');
			if(player.getDynamicProperty(project_global_settings["PLAYER_SETTING_KEYS"][sound_flag]) && sound_open) player.playSound(sound_open);
			forms_display_start(player, forms_control, project_global_settings);  // Choose the forms_control that matches the item
			if(player.getDynamicProperty(project_global_settings["PLAYER_SETTING_KEYS"][item_top_up_flag]) === true) {
				let inv = player.getComponent( 'inventory' ).container
				for(let [item1,v] of item_top_up) {
					let found = false;
					for(let slot = 0; slot < inv.size; slot++) {
						if(inv.getItem(slot)) {
							if(inv.getItem(slot).typeId == item1) {
								found = true;
							};
						};
					};
					if (found == false) {
						const playerPosition = player.location;
						const item = new mc.ItemStack(item1, v);
						player.dimension.spawnItem(item, playerPosition);
					};
				};
			};			
			
        };
    });
};

function forms_display_start(player, forms_control, project_global_settings) {
	if(project_global_settings["DEBUG"]) player.sendMessage('forms_display_start '+JSON.stringify(forms_control, undefined, 2));
	const start_form = forms_control[FORMS_START_KEY];
	forms_display(forms_control, project_global_settings, start_form, player);  // Start navigation
}

function forms_display(forms_control, project_global_settings, form_name, player) {
	if(project_global_settings["DEBUG"]) player.sendMessage('forms_display '+form_name);
	let this_form = undefined;
	
	if(form_name === undefined) {
		return; // We've got no place to go. Exit navigation. Play close sound?
	};
	if(forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_BUTTONS) {
		if(forms_control[FORMS_CACHABLE_KEY][form_name] === undefined) { 
			forms_control[FORMS_CACHABLE_KEY][form_name] = form_builder_buttons(forms_control[form_name], project_global_settings, player);
		}
		this_form = forms_control[FORMS_CACHABLE_KEY][form_name];
	} else if(forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_CONTROLS) {
		this_form = form_builder_controls(forms_control[form_name], project_global_settings, player);
	} else if(forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_YESNO) {
		if(forms_control[FORMS_CACHABLE_KEY][form_name] === undefined) { 
			forms_control[FORMS_CACHABLE_KEY][form_name] = form_builder_yesno(forms_control[form_name], project_global_settings, player);
		}
		this_form = forms_control[FORMS_CACHABLE_KEY][form_name];		
	}
	
	this_form.show(player).then((response) => { 
			if(project_global_settings["DEBUG"]) player.sendMessage('RESPONSE '+JSON.stringify(response, undefined, 2));
			forms_response_handler(response, forms_control, project_global_settings, form_name, player) 
		}
		).catch((error) => {
			if(project_global_settings["DEBUG"]) player.sendMessage(error+" "+error.stack);
		});
}

function forms_response_handler(response, forms_control, project_global_settings, form_name, player) {
	if(project_global_settings["DEBUG"]) player.sendMessage('forms_response_handler '+form_name+" "+JSON.stringify(response, undefined, 2)+String(response.selection));
	if(response === undefined || response.cancelled || (response.selection == undefined && forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_BUTTONS)) {
		return; // do nothing? Drop out of the forms entirely?
	}
	if(forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_BUTTONS || forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_YESNO) {
		// I'm holding an index describing the position of the button onscreen and can use it to navigate to the next form
		let navigate_to_form_name = forms_control[form_name][FORMS_NAVIGATE_KEY][response.selection][2];  // Expecting an array of targets
		let run_after = forms_control[form_name][FORMS_RUN_AFTER_KEY];  // Optional function to call after execution
		if(run_after) {
			run_after(player); // Call function to create dynamic layout
		};		
		forms_display(forms_control, project_global_settings, navigate_to_form_name, player);  // Show the next form
	} else if(forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_CONTROLS) {
		// I'm holding a rich data structure of values and can use it to update global and player settings before navigating to the next form
		let navigate_to_form_name = forms_control[form_name][FORMS_NAVIGATE_KEY];  // Expecting one target only
		if(project_global_settings["DEBUG"]) player.sendMessage('forms_response_handler '+form_name+" "+JSON.stringify(navigate_to_form_name, undefined, 2));

		//  Update all the values
		if(response.formValues !== undefined) {
			// mc.world.sendMessage(JSON.stringify(response.formValues, undefined, 2))
			let idx = 0;
			for(let c of forms_control[form_name][FORMS_CONTROLS_KEY]) {
				// mc.world.sendMessage(String(c)+JSON.stringify(forms_control[form_name][FORMS_CONTROLS_KEY][c], undefined, 2))
				let scope = c[0];
				let type = c[1];
				let setting = c[2];
				let val = response.formValues[idx];
				// mc.world.sendMessage(scope+","+type+","+setting+","+String(val))
				if(type === FORMS_CONTROL_INPUT && (val === '' || val === undefined)) {
					// Do not update if no value provided
				} else {
					// mc.world.sendMessage(scope)
					// mc.world.sendMessage(JSON.stringify(project_global_settings, undefined, 2))
					if(scope === FORMS_CONTROL_SCOPE_GLOBAL) {
						project_global_settings[setting] = val;
						// mc.world.sendMessage("GLOBAL: "+String(setting)+":"+String(val));
						mc.world.setDynamicProperty(setting, val);
						// mc.world.sendMessage(setting+" "+String(val)+" "+String(project_global_settings[setting]));
					}
					if (scope === FORMS_CONTROL_SCOPE_PLAYER){
						player.setDynamicProperty(setting, val);
					}
				}
				idx += 1;
			}
		}
		let run_after = forms_control[form_name][FORMS_RUN_AFTER_KEY];  // Optional function to call after execution
		if(run_after) {
			run_after(player); // Call function to create dynamic layout
		};

		forms_display(forms_control, project_global_settings, navigate_to_form_name, player);
	} 
}

function form_builder_buttons(form_control, project_global_settings, player) {
	if(project_global_settings["DEBUG"]) player.sendMessage('form_builder_buttons '+JSON.stringify(form_control, undefined, 2));
	let result = new mcui.ActionFormData()
					.title({rawtext: [{translate:  form_control[FORMS_TITLE_KEY],with: ["\n"]}]})
					.body({rawtext: [{translate: form_control[FORMS_BODY_KEY],with: ["\n"]}]})
	for(let val in form_control[FORMS_NAVIGATE_KEY]) {
		// player.sendMessage('form_builder_buttons '+JSON.stringify(val, undefined, 2));
		let name = form_control[FORMS_NAVIGATE_KEY][val][0];
		let icon = form_control[FORMS_NAVIGATE_KEY][val][1];
		// let nav = val[2];  // Ignore navigation when building the form.
		
		if(icon !== undefined) {
			result.button({rawtext: [{translate: name,with: ["\n"]}]} , icon);
		} else {
			result.button({rawtext: [{translate: name,with: ["\n"]}]});
		};
	}
	return result;
}

function form_builder_yesno(form_control, project_global_settings, player) {
	if(project_global_settings["DEBUG"]) player.sendMessage('form_builder_yesno '+JSON.stringify(form_control, undefined, 2));
	let result = new mcui.MessageFormData()
					.title({rawtext: [{translate: form_control[FORMS_TITLE_KEY],with: ["\n"]}]})
					.body({rawtext: [{translate: form_control[FORMS_BODY_KEY],with: ["\n"]}]})
	let name = form_control[FORMS_NAVIGATE_KEY][0][0];
	result.button1({rawtext: [{translate: name,with: ["\n"]}]});
	name = form_control[FORMS_NAVIGATE_KEY][1][0];
	result.button2({rawtext: [{translate: name,with: ["\n"]}]});
	return result;
}

function form_builder_controls(form_control, project_global_settings, player) {
	if(project_global_settings["DEBUG"]) player.sendMessage('form_builder_controls '+JSON.stringify(form_control, undefined, 2)+' '+JSON.stringify(form_control[FORMS_CONTROLS_KEY], undefined, 2));
	let result = new mcui.ModalFormData().title({rawtext: [{translate: form_control[FORMS_TITLE_KEY],with: ["\n"]}]});
	for(let c in form_control[FORMS_CONTROLS_KEY]) {
		let scope = form_control[FORMS_CONTROLS_KEY][c][0];
		let type = form_control[FORMS_CONTROLS_KEY][c][1];
		let setting = form_control[FORMS_CONTROLS_KEY][c][2];
		let name = form_control[FORMS_CONTROLS_KEY][c][3];
		let def = form_control[FORMS_CONTROLS_KEY][c][4];  // Do I want to cater for not having a default value?		
		let val = def;

		if(project_global_settings["DEBUG"]) player.sendMessage(String(scope) +' '+ String(type) +' '+ String(setting) +' '+ JSON.stringify(name, undefined, 2) +' '+ String(def) +' '+ String(val));

		if(scope === FORMS_CONTROL_SCOPE_GLOBAL) {
			val = project_global_settings[setting]
		} else if (scope == FORMS_CONTROL_SCOPE_PLAYER){
			val = player.getDynamicProperty(setting);
			if(val === undefined) {
				player.setDynamicProperty(setting, def);
				val = def;
			}
		}
		
		if(type === FORMS_CONTROL_BOOL) {
			result.toggle({rawtext: [{translate: name,with: ["\n"]}]}, val);
		} else if(type === FORMS_CONTROL_INPUT) {
			result.textField({rawtext: [{translate: name,with: ["\n"]}]}, val);
		} else if(type === FORMS_CONTROL_SLIDER) {
			result.slider({rawtext: [{translate: name,with: ["\n"]}]}, form_control[FORMS_CONTROLS_KEY][c][5], form_control[FORMS_CONTROLS_KEY][c][6], form_control[FORMS_CONTROLS_KEY][c][7], val);
		} else if(type === FORMS_CONTROL_SELECT) {
			result.dropdown({rawtext: [{translate: name,with: ["\n"]}]}, form_control[FORMS_CONTROLS_KEY][c][5], val);
		}
	}
	
	return result;
}

export {  show_forms_on_item_use as default, show_forms_on_item_use };