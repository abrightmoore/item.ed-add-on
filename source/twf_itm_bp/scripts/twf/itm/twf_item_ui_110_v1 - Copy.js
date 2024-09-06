import * as mc from "@minecraft/server";
import * as mcui from "@minecraft/server-ui";
import * as twfguide from "./guide";
import * as twfui from "./libs/twfui";

// @TheWorldFoundry

/*
	2024-06-03 Initial - Item editor
*/

/*  PROJECT NAMESPACE  */
const studio = 'twf'
const project = 'itm'
const ns = studio+"_"+project+":"

/*  PROJECT SPECIFIC SETTINGS */
const SETTING_ITEM_LEVEL = studio+'_'+project+'_'+'_level'

const enchantments = [
	"none",
	"aqua_affinity",
	"bane_of_arthropods",
	"binding",
	"blast_protection",
	"channeling",
	"depth_strider",
	"efficiency",
	"feather_falling",
	"fire_aspect",
	"fire_protection",
	"flame",
	"fortune",
	"frost_walker",
	"impaling",
	"infinity",
	"knockback",
	"looting",
	"loyalty",
	"luck_of_the_sea",
	"lure",
	"mending",
	"multishot",
	"piercing",
	"power",
	"projectile_protection",
	"protection",
	"punch",
	"quick_charge",
	"respiration",
	"riptide",
	"sharpness",
	"silk_touch",
	"smite",
	"soul_speed",
	"swift_sneak",
	"thorns",
	"unbreaking",
	"vanishing"
]

let project_global_settings = {
	DEBUG : false,
	twf_itm_level : 1
}

/*  PROJECT SPECIFIC FORMS LAYOUT AND LOGIC */
const FORMS_CACHABLE_KEY = 'cache';
const FORMS_TYPE_BUTTONS = 'buttons';
const FORMS_TYPE_CONTROLS = 'controls';
const FORMS_TYPE_YESNO = 'yesno';
const FORMS_START_KEY = 'start';
const FORMS_TYPE_KEY = 'type';
const FORMS_TITLE_KEY = 'title';
const FORMS_BODY_KEY = 'body';
const FORMS_NAVIGATE_KEY = 'nav';
const FORMS_CONTROLS_KEY = 'controls';
const FORMS_CONTROL_BOOL = 'bool';
const FORMS_CONTROL_SLIDER = 'slider';
const FORMS_CONTROL_SELECT = 'select';
const FORMS_CONTROL_INPUT = 'input';
const FORMS_CONTROL_SCOPE_PLAYER = 'player';
const FORMS_CONTROL_SCOPE_GLOBAL = 'global';

/*  FORMS DISPLAY AND NAVIGATION HANDLING */

const show_forms_on_item_use = ({ itemTypeId, forms_control, sound_open, sound_close }) => {
    mc.world.afterEvents.itemUse.subscribe(async (event) => {
        const { source: player, itemStack } = event;
        if (itemStack.typeId === itemTypeId) {
			if(project_global_settings["DEBUG"]) player.sendMessage('show_forms_on_item_use');
            forms_display_start(player, forms_control, sound_open, sound_close);  // Choose the forms_control that matches the item
        };
    });
};

function forms_display_start(player, forms_control, sound_open, sound_close) {
	if(project_global_settings["DEBUG"]) player.sendMessage('forms_display_start '+JSON.stringify(forms_control, undefined, 2));
	const start_form = forms_control[FORMS_START_KEY];
	
	// play open sound
	
	forms_display(forms_control, start_form, player);  // Start navigation
	
}

function forms_display(forms_control, form_name, player) {
	if(project_global_settings["DEBUG"]) player.sendMessage('forms_display '+form_name);
	let this_form = undefined;
	
	if(form_name === undefined) {
		return; // We've got no place to go. Exit navigation. Play close sound?
	};
	if(forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_BUTTONS) {
		if(forms_control[FORMS_CACHABLE_KEY][form_name] === undefined) { 
			forms_control[FORMS_CACHABLE_KEY][form_name] = form_builder_buttons(forms_control[form_name], player);
		}
		this_form = forms_control[FORMS_CACHABLE_KEY][form_name];
	} else if(forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_CONTROLS) {
		this_form = form_builder_controls(forms_control[form_name], player);
	} else if(forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_YESNO) {
		if(forms_control[FORMS_CACHABLE_KEY][form_name] === undefined) { 
			forms_control[FORMS_CACHABLE_KEY][form_name] = form_builder_yesno(forms_control[form_name], player);
		}
		this_form = forms_control[FORMS_CACHABLE_KEY][form_name];		
	}
	
	this_form.show(player).then((response) => { 
			if(project_global_settings["DEBUG"]) player.sendMessage('RESPONSE '+JSON.stringify(response, undefined, 2));
			forms_response_handler(response, forms_control, form_name, player) 
		}
		).catch((error) => {
			if(project_global_settings["DEBUG"]) player.sendMessage(error+" "+error.stack);
		});
}

function forms_response_handler(response, forms_control, form_name, player) {
	if(project_global_settings["DEBUG"]) player.sendMessage('forms_response_handler '+form_name+" "+JSON.stringify(response, undefined, 2)+String(response.selection));
	if(response === undefined || response.cancelled || (response.selection == undefined && forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_BUTTONS)) {
		return; // do nothing? Drop out of the forms entirely?
	}
	if(forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_BUTTONS || forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_YESNO) {
		// I'm holding an index describing the position of the button onscreen and can use it to navigate to the next form
		let navigate_to_form_name = forms_control[form_name][FORMS_NAVIGATE_KEY][response.selection][2];  // Expecting an array of targets
		forms_display(forms_control, navigate_to_form_name, player);  // Show the next form
	} else if(forms_control[form_name][FORMS_TYPE_KEY] === FORMS_TYPE_CONTROLS) {
		// I'm holding a rich data structure of values and can use it to update global and player settings before navigating to the next form
		let navigate_to_form_name = forms_control[form_name][FORMS_NAVIGATE_KEY];  // Expecting one target only
		if(project_global_settings["DEBUG"]) player.sendMessage('forms_response_handler '+form_name+" "+JSON.stringify(navigate_to_form_name, undefined, 2));
		
		//  Update all the values
		if(response.formValues !== undefined) {
			for(let c in forms_control[form_name][FORMS_CONTROLS_KEY]) {
				let scope = forms_control[form_name][FORMS_CONTROLS_KEY][c][0];
				let type = forms_control[form_name][FORMS_CONTROLS_KEY][c][1];
				let setting = forms_control[form_name][FORMS_CONTROLS_KEY][c][2];
				
				if(type === FORMS_CONTROL_INPUT && (response.formValues[c] === '' || response.formValues[c] === undefined)) {
					// Do not update if no value provided
				} else if(scope === FORMS_CONTROL_SCOPE_GLOBAL) {
					project_global_settings[setting] = response.formValues[c]
				} else if (scope == FORMS_CONTROL_SCOPE_PLAYER){
					player.setDynamicProperty(setting, response.formValues[c]);
				}
			}
		}
		forms_display(forms_control, navigate_to_form_name, player);
	} 
}

function form_builder_buttons(form_control, player) {
	if(project_global_settings["DEBUG"]) player.sendMessage('form_builder_buttons '+JSON.stringify(form_control, undefined, 2));
	let result = new mcui.ActionFormData()
					.title(form_control[FORMS_TITLE_KEY])
					.body(form_control[FORMS_BODY_KEY])
	for(let val in form_control[FORMS_NAVIGATE_KEY]) {
		// player.sendMessage('form_builder_buttons '+JSON.stringify(val, undefined, 2));
		let name = form_control[FORMS_NAVIGATE_KEY][val][0];
		let icon = form_control[FORMS_NAVIGATE_KEY][val][1];
		// let nav = val[2];  // Ignore navigation when building the form.
		
		if(icon !== undefined) {
			result.button(name, icon);
		} else {
			result.button(name);
		};
	}
	return result;
}

function form_builder_yesno(form_control, player) {
	if(project_global_settings["DEBUG"]) player.sendMessage('form_builder_yesno '+JSON.stringify(form_control, undefined, 2));
	let result = new mcui.MessageFormData()
					.title(form_control[FORMS_TITLE_KEY])
					.body(form_control[FORMS_BODY_KEY])
	let name = form_control[FORMS_NAVIGATE_KEY][0][0];
	result.button1(name);
	name = form_control[FORMS_NAVIGATE_KEY][1][0];
	result.button2(name);
	return result;
}

function form_builder_controls(form_control, player) {
	if(project_global_settings["DEBUG"]) player.sendMessage('form_builder_controls '+JSON.stringify(form_control, undefined, 2)+' '+JSON.stringify(form_control[FORMS_CONTROLS_KEY], undefined, 2));
	let result = new mcui.ModalFormData().title(form_control[FORMS_TITLE_KEY]);
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
			result.toggle(name, val);
		} else if(type === FORMS_CONTROL_INPUT) {
			result.textField(name, val);
		} else if(type === FORMS_CONTROL_SLIDER) {
			result.slider(name, form_control[FORMS_CONTROLS_KEY][c][5], form_control[FORMS_CONTROLS_KEY][c][6], form_control[FORMS_CONTROLS_KEY][c][7], val);
		} else if(type === FORMS_CONTROL_SELECT) {
			result.dropdown(name, form_control[FORMS_CONTROLS_KEY][c][5], val);
		}
	}
	
	return result;
}

/* CUSTOM FORM LAYOUT AND NAVIGATION PLAN GOES HERE
*/
const item_type_array = [
	"minecraft:diamond_axe",
	"minecraft:diamond_boots",
	"minecraft:diamond_chestplate",
	"minecraft:diamond_helmet",
	"minecraft:diamond_hoe",
	"minecraft:diamond_horse_armor",
	"minecraft:diamond_leggings",
	"minecraft:diamond_pickaxe",
	"minecraft:diamond_shovel",
	"minecraft:diamond_sword",

	"minecraft:golden_axe",
	"minecraft:golden_boots",
	"minecraft:golden_chestplate",
	"minecraft:golden_helmet",
	"minecraft:golden_hoe",
	"minecraft:golden_horse_armor",
	"minecraft:golden_leggings",
	"minecraft:golden_pickaxe",
	"minecraft:golden_shovel",
	"minecraft:golden_sword",

	"minecraft:iron_axe",
	"minecraft:iron_boots",
	"minecraft:iron_chestplate",
	"minecraft:iron_helmet",
	"minecraft:iron_hoe",
	"minecraft:iron_horse_armor",
	"minecraft:iron_leggings",
	"minecraft:iron_pickaxe",
	"minecraft:iron_shovel",
	"minecraft:iron_sword",

	"minecraft:netherite_axe",
	"minecraft:netherite_boots",
	"minecraft:netherite_chestplate",
	"minecraft:netherite_helmet",
	"minecraft:netherite_hoe",
	"minecraft:netherite_leggings",
	"minecraft:netherite_pickaxe",
	"minecraft:netherite_shovel",
	"minecraft:netherite_sword",

	"minecraft:stone_axe",
	"minecraft:stone_hoe",
	"minecraft:stone_pickaxe",
	"minecraft:stone_shovel",
	"minecraft:stone_sword",

	"minecraft:wooden_axe",
	"minecraft:wooden_hoe",
	"minecraft:wooden_pickaxe",
	"minecraft:wooden_shovel",
	"minecraft:wooden_sword",
	
	"minecraft:bow",
	"minecraft:crossbow"
]

let forms_control_guide_item_editor = {
	cache : {},
	start : "contents",
	contents : {
		type : 'buttons',
		cache : true,
		title : { translate: ns+"guide_form_contents_title" },
		body : { translate: ns+"guide_form_contents_body" },
		nav : [
			[{ translate: ns+"guide_button_craft" }, 'textures/blocks/crafting_table_top', "item_selector"],
			[{ translate: ns+"guide_button_howto" }, 'textures/blocks/beacon', "howto"],
			[{ translate: ns+"guide_button_settings" }, 'textures/blocks/command_block', "settings"],
			[{ translate: ns+"guide_exit" }, 'textures/blocks/barrier', undefined]
		]
	},
	item_selector : {
		type : 'buttons',
		cache : true,
		title : { translate: ns+"guide_form_item_selector_title" },
		body : { translate: ns+"guide_form_item_selector_body" },
		nav : [
			[{ translate: ns+"guide_button_weapons" }, 'textures/items/diamond_sword', "weapons"],
			[{ translate: ns+"guide_button_armour" }, 'textures/items/gold_chestplate', "armour"],
			[{ translate: ns+"guide_button_tools" }, 'textures/items/stone_shovel', "tools"],
			
			[{ translate: ns+"guide_button_contents" }, 'textures/blocks/bookshelf', "contents"],
			[{ translate: ns+"guide_exit" }, 'textures/blocks/barrier', undefined]
		]
	},
	
	weapons : {
		type : 'buttons',
		cache : true,
		title : { translate: ns+"guide_form_item_weapons_title" },
		body : { translate: ns+"guide_form_item_weapons_body" },
		nav : [
			[{ translate: ns+"guide_button_swords" }, 'textures/items/diamond_sword', "item_editor"],
			[{ translate: ns+"guide_button_axes" }, 'textures/items/gold_axe', "item_editor"],
			[{ translate: ns+"guide_button_ranged" }, 'textures/items/crossbow_standby', "item_editor"],
			
			[{ translate: ns+"guide_button_contents" }, 'textures/blocks/bookshelf', "contents"],
			[{ translate: ns+"guide_exit" }, 'textures/blocks/barrier', undefined]
		]
	},

	armour : {
		type : 'buttons',
		cache : true,
		title : { translate: ns+"guide_form_item_armour_title" },
		body : { translate: ns+"guide_form_item_armour_body" },
		nav : [
			[{ translate: ns+"guide_button_helmets" }, 'textures/items/diamond_helmet', "item_editor"],
			[{ translate: ns+"guide_button_chestplate" }, 'textures/items/gold_chestplate', "item_editor"],
			[{ translate: ns+"guide_button_leggings" }, 'textures/items/netherite_leggings', "item_editor"],
			[{ translate: ns+"guide_button_boots" }, 'textures/items/iron_boots', "item_editor"],
			
			[{ translate: ns+"guide_button_contents" }, 'textures/blocks/bookshelf', "contents"],
			[{ translate: ns+"guide_exit" }, 'textures/blocks/barrier', undefined]
		]
	},

	tools : {
		type : 'buttons',
		cache : true,
		title : { translate: ns+"guide_form_item_tools_title" },
		body : { translate: ns+"guide_form_item_tools_body" },
		nav : [
			[{ translate: ns+"guide_button_pickaxes" }, 'textures/items/diamond_pickaxe', "item_editor"],
			[{ translate: ns+"guide_button_axes" }, 'textures/items/golden_hoe', "item_editor"],
			[{ translate: ns+"guide_button_shovels" }, 'textures/items/stone_shovel', "item_editor"],
			
			[{ translate: ns+"guide_button_contents" }, 'textures/blocks/bookshelf', "contents"],
			[{ translate: ns+"guide_exit" }, 'textures/blocks/barrier', undefined]
		]
	},
	
	
	craft : {
		type : 'buttons',
		cache : true,
		title : { translate: ns+"guide_form_craft_title" },		
		body : { translate: ns+"guide_form_craft_body" },
		nav : [
			[{ translate: ns+"guide_button_contents" }, 'textures/blocks/bookshelf', "contents"],
			[{ translate: ns+"guide_button_howto" }, 'textures/blocks/beacon', "howto"],
			[{ translate: ns+"guide_exit" }, 'textures/blocks/barrier', undefined]
		]
	},
	howto : {
		type : 'buttons',
		cache : true,
		title : { translate: ns+"guide_form_contents_howto" },
		body : { translate: ns+"guide_form_howto_body" },
		nav : [
			[{ translate: ns+"guide_button_contents" }, 'textures/blocks/bookshelf', "contents"],
			[{ translate: ns+"guide_button_craft" }, 'textures/blocks/crafting_table_top', "craft"],
			[{ translate: ns+ns+"guide_exit" }, 'textures/blocks/barrier', undefined]
		]
	},
	message : {
		type : 'yesno',
		cache : true,
		title : { translate: ns+"guide_form_message_title" },		
		body : { translate: ns+"guide_form_message_body" },
		nav : [
			[{ translate: ns+"guide_button_yes" }, undefined, "contents"],
			[{ translate: ns+"guide_button_no" }, undefined, "settings"]
		]
	},	
	settings : {
		type : 'controls',
		cache : false,
		title : { translate: ns+"guide_form_settings_title" },		
		controls: [
			['global', 'bool', "DEBUG", { translate: ns+"guide_form_settings_debug" }, false]
		],
		nav : "message"
	},	
	item_editor : {
		type : 'controls',
		cache : false,
		title : { translate: ns+"guide_form_settings_title" },		
		controls: [
			['player', 'bool', ns+"_create_item_flag", { translate: ns+"guide_form_settings_item_create_signal" }, true],
			['player', 'select', ns+"_item_type", { translate: ns+"guide_form_settings_item_type" }, 0, item_type_array],
			['player', 'input', ns+"_item_name", { translate: ns+"guide_form_settings_item_name" }, 'Name your new item' ],
			['player', 'slider', ns+"_item_damage", { translate: ns+"guide_form_settings_item_damage" }, 0, 0, 255, 1],
			['player', 'input', ns+"_item_description", { translate: ns+"guide_form_settings_item_description" }, 'Description' ],
			['player', 'input', ns+"_item_history", { translate: ns+"guide_form_settings_item_history" }, 'History' ],
			['player', 'input', ns+"_item_notes", { translate: ns+"guide_form_settings_item_notes" }, 'Notes' ],
			['player', 'input', ns+"_item_owner", { translate: ns+"guide_form_settings_item_owner" }, 'Original owner' ]
		],
		nav : "message"
	},
	enchant_editor1 : { // Waiting on 1.21
		type : 'controls',
		cache : false,
		title : { translate: ns+"guide_form_settings_title" },		
		controls: [
			['player', 'select', ns+"_item_enchant1", { translate: ns+"guide_form_settings_item_enchant1" }, 0, enchantments],
			['player', 'slider', ns+"_item_enchant1_level", { translate: ns+"guide_form_settings_item_enchant1_level" }, 1, 1, 5, 1],
			['player', 'select', ns+"_item_enchant2", { translate: ns+"guide_form_settings_item_enchant2" }, 0, enchantments],
			['player', 'slider', ns+"_item_enchant2_level", { translate: ns+"guide_form_settings_item_enchant2_level" }, 1, 1, 5, 1],
			['player', 'select', ns+"_item_enchant3", { translate: ns+"guide_form_settings_item_enchant3" }, 0, enchantments],
			['player', 'slider', ns+"_item_enchant3_level", { translate: ns+"guide_form_settings_item_enchant3_level" }, 1, 1, 5, 1]
		],
		nav : "message"
	}
};


/* Game loop handling
*/

show_forms_on_item_use({
  itemTypeId: "minecraft:stick",
  forms_control: forms_control_guide_item_editor,
  sound_open: "random.chestopen",
  sound_close: "random.chestclosed"
});

mc.world.afterEvents.itemUse.subscribe(async (event) => {
        const { source: player, itemStack } = event;
        if (itemStack.typeId === "minecraft:deadbush") {
            if(player.getDynamicProperty(ns+"_create_item_flag") === true) { // Set in the book
				let description = player.getDynamicProperty(ns+"_item_description");
				let ihistory = player.getDynamicProperty(ns+"_item_history");
				let notes = player.getDynamicProperty(ns+"_item_notes");
				let owner = player.getDynamicProperty(ns+"_item_owner");
				let name = player.getDynamicProperty(ns+"_item_name");
				let type = item_type_array[player.getDynamicProperty(ns+"_item_type")];
				let durability = player.getDynamicProperty(ns+"_item_durability");
				let damage = player.getDynamicProperty(ns+"_item_damage");

				if(project_global_settings["DEBUG"]) player.sendMessage(String(description) +' '+ String(ihistory) +' '+ String(notes)+' '+ String(owner) +' '+ String(name)+' '+String(type));

				const item = new mc.ItemStack(type, 1);
				
				let lore = [];
				if(description !== undefined && description != ' ') {
					// lore.push('§c§lDescription§r');
					lore.push(description);
				}
				if(ihistory !== undefined && ihistory != ' ') {
					// lore.push('§c§lHistory§r');
					lore.push(ihistory);
				}
				if(notes !== undefined && notes != ' ') {
					// lore.push('§c§lNotes§r');
					lore.push(notes);
				}
				if(owner !== undefined && owner != ' ') {
					// lore.push('§c§lOwner§r');
					lore.push(owner);
				}
				item.setLore(lore);
				item.nameTag = name;

				const durabilityComponent = item.getComponent("minecraft:durability");
				if (durabilityComponent !== undefined) {
					if(damage !== undefined) {
						if(damage < durabilityComponent.maxDurability) {
							durabilityComponent.damage = damage;
						} else {
							durabilityComponent.damage = 0;
						}
					}
				}
				
				/*
				const enchantments = item.getComponent("minecraft:enchantable");
				if(project_global_settings["DEBUG"]) player.sendMessage("Enchanting " +JSON.stringify(enchantments, undefined, 2));
				if (enchantments) {
					let ench1 =  player.getDynamicProperty(ns+"_item_enchant1");
					let ench1lvl =  player.getDynamicProperty(ns+"_item_enchant1_level");
					let ench2 =  player.getDynamicProperty(ns+"_item_enchant2");
					let ench2lvl =  player.getDynamicProperty(ns+"_item_enchant2_level");
					let ench3 =  player.getDynamicProperty(ns+"_item_enchant3");
					let ench3lvl =  player.getDynamicProperty(ns+"_item_enchant3_level");
					
					if(ench1 !== undefined && ench1 > 0 && ench1lvl != undefined) {
						
						enchantments.addEnchantment({ type: ench1, level: ench1lvl });
						if(ench2 !== undefined && ench2 > 0 && ench2lvl != undefined) {
							enchantments.addEnchantment({ type: ench2, level: ench2lvl });
							if(ench3 !== undefined && ench3 > 0 && ench3lvl != undefined) {
								enchantments.addEnchantment({type: ench3, level: ench3lvl });
							}
						}
					}
				};
				*/
				player.dimension.spawnItem(item, player.location);
			};
        };
    });
