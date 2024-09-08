import * as mc from "@minecraft/server";
import * as mcui from "@minecraft/server-ui";
import * as twfguide from "./guide";
import * as twfui from "./libs/twfui";
import * as twfname from "./naming";

const item_type_array = twfname.item_type_array;
const enchantments = twfname.enchantments;
const block_type_array = twfname.block_type_array;

// @TheWorldFoundry

/*
	2024-06-03 Initial - Item editor
	2024-07-19 Revise for enchants
	2024-08-04 Procedural wizards
*/

/*  PROJECT NAMESPACE  */
const studio = 'twf'
const project = 'itm'
const ns = studio+"_"+project+":"
const SETTING_ITEM_LEVEL = studio+'_'+project+'_'+'_level'
const MAX_ENCHANT_LEVEL = 5;
const MAX_NUM_ITEM_ENCHANTS = 3;



function log(message) {
	if(message) {
		try {
			mc.world.sendMessage(JSON.stringify(message, undefined, 2))
		} catch(error) {
			mc.world.sendMessage(String(error));
			mc.world.sendMessage(String(error.stack));
		};
	};
};

function test_enchantments(type) {
	// 2024-08-03 This procedure attempts to enchant items and builds a list of those enchantments that are OK to use.
	// Expensive due to the lots of little attempts to enchant

	let valid_enchants = [];
	let item = undefined;
	let enchantment = undefined;
	let max_enchant_lvl = 0;
	
	for(let enchant in enchantments) {
		max_enchant_lvl = 0;
		for(let i = 1; i <= MAX_ENCHANT_LEVEL; i++) {
			item = new mc.ItemStack(type, 1);  // Test item with no enchants. Ephemeral
			enchantment = item.getComponent("minecraft:enchantable");
			if (enchantment) {
				try {
					enchantment.addEnchantment({ type: new mc.EnchantmentType(enchantments[enchant]), level: i });
					max_enchant_lvl = i;
				} catch(error) {
					//pass
				}
			}
		}

		if(max_enchant_lvl > 0) {
			try {
				for(let i = 1; i <= max_enchant_lvl; i++) {
					valid_enchants.push({enchantment: enchantments[enchant], level: i});
				};
			} catch(error) { 
				// pass
			}
		}
	}

	return valid_enchants;
};

let project_global_settings = {
	DEBUG : false,
	twf_itm_level : 1,
	PLAYER_SETTING_KEYS: {
		LT_SOUNDS_SETTING: 'twf_itm_setting_sounds',
		LT_EQUIP_SETTING: 'twf_itm_setting_equip'
	}
}

function initialise_global_defaults() {
	try {
		for(let prop in project_global_settings) {
			if(prop !== "PLAYER_SETTING_KEYS") {
				let curr_val = mc.world.getDynamicProperty(prop);
				if( curr_val === undefined) {
					mc.world.setDynamicProperty(prop, project_global_settings[prop]); // Initialise
				} else {  // Replace script defaults with world value
					project_global_settings[prop] = curr_val; // Initialise
					// project_global_settings["DEBUG"] = true;
					project_global_settings["DEBUG"] = false;
				}
			}
		}
	} catch(error) {

	}
}

initialise_global_defaults();

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

/* CUSTOM FORM LAYOUT AND NAVIGATION PLAN GOES HERE
*/


let forms_control_guide = {
	cache : {},	
	start : "contents",
	
	generate_intro : {
		type : 'buttons',
		cache : true,
		title : ns+"guide_form_generate_intro_title",
		body : ns+"guide_form_generate_intro_body",
		nav : [
				[ns+"guide_button_"+"check_inventory", undefined, "check_inventory"]
			],
		run_after : generate_random_item
	},

	generate_items_intro : {
		type : 'buttons',
		cache : true,
		title : ns+"guide_form_generate_items_intro_title",
		body : ns+"guide_form_generate_items_intro_body",
		nav : [
				[ns+"guide_button_"+"check_inventory", undefined, "check_inventory"]
			],
		run_after : generate_random_items
	},

	can_place_on_inst : {
		type : 'buttons',
		cache : false,
		title : ns+"guide_form_can_place_on_inst_title",
		body : ns+"guide_form_can_place_on_inst_body",
		nav : [
				[ns+"guide_button_"+"can_place_on", undefined, "can_place_on"]
			],
		run_after : make_can_place_on_book_page
	},
	
	can_destroy_inst : {
		type : 'buttons',
		cache : false,
		title : ns+"guide_form_can_destroy_inst_title",
		body : ns+"guide_form_can_destroy_inst_body",
		nav : [
				[ns+"guide_button_"+"can_destroy", undefined, "can_destroy"]
			],
		run_after : make_can_destroy_book_page
	},	

	slots_inst : {
		type : 'buttons',
		cache : false,
		title : ns+"guide_form_slots_inst_title",
		body : ns+"guide_form_slots_inst_body",
		nav : [
				[ns+"guide_button_"+"slots", undefined, "slots"]
			],
		run_after : make_slots_book_page
	},


	slots : {
		type : 'buttons',
		cache : false,
		title : ns+"guide_form_slots_title",
		body : "I found these items on your person:\n",
		nav : [
				
			],
		run_after : make_slot_view_page
	},	

	slot : {
		type : 'buttons',
		cache : false,
		title : ns+"guide_form_slot_title",
		body : "Work in progress: Details of the selected Item will show here.\n",
		nav : [
				
			],
		run_after : make_slot_view_page
	},	
	
	item_editor : {
		type : 'controls',
		cache : false,
		title : ns+"guide_form_item_editor_title",
		controls: [
			['player', 'bool', ns+"_create_item_flag", ns+"guide_form_settings_item_create_signal", true],
			['player', 'select', ns+"_item_type", ns+"guide_form_settings_item_type", 0, item_type_array],
			['player', 'input', ns+"_item_name", ns+"guide_form_settings_item_name", 'Name your new item' ],
			['player', 'slider', ns+"_item_damage", ns+"guide_form_settings_item_damage", 0, 0, 255, 1],
			['player', 'input', ns+"_item_description", ns+"guide_form_settings_item_description", 'Description' ],
			['player', 'input', ns+"_item_history", ns+"guide_form_settings_item_history", 'History' ],
			['player', 'input', ns+"_item_notes", ns+"guide_form_settings_item_notes", 'Notes' ],
			['player', 'input', ns+"_item_owner", ns+"guide_form_settings_item_owner", 'Original owner' ]
		],
		nav : "enchant_editor_inst",
		run_after : refresh_enchants_ui
	},

	smith : {
		type : 'buttons',
		cache : true,
		title : ns+"guide_form_smith_title",
		body : ns+"guide_form_smith_body",
		nav : [
				[ns+"guide_button_"+"gave_item", undefined, "gave_item"]
			],
		run_after : give_item
	},

	gave_item : {
		type : 'buttons',
		cache : true,
		title : ns+"guide_form_gave_item_title",
		body : ns+"guide_form_gave_item_body",
		nav : [
				[ns+"guide_button_"+"contents", undefined, "contents"]
			],
		run_after : give_item
	},
	
	show_template_inst : {
		type : 'buttons',
		cache : false,
		title : ns+"guide_form_show_template_inst_title",
		body : "The Item Forge uses the settings you choose to create a new item.\n",
		nav : [
				[ns+"guide_button_show_template", undefined, "show_template"],
				[ns+"guide_button_"+"contents", undefined, "contents"]
			],
		run_after : make_show_template_page
	},
	
	show_template : {
		type : 'buttons',
		cache : false,
		title : ns+"guide_form_show_template_title",
		body : "Here are the current settings for the Item Forge:\n",
		nav : [
				[ns+"guide_button_"+"contents", undefined, "contents"]
			],
		run_after : make_show_template_page
	}	
};

twfguide.init_forms(forms_control_guide, ns);

function make_slot_view_page(player) {
	// Show the details of the selected Item
	try {
		let inv = player.getComponent( 'inventory' ).container;
			// todo - pass in the item reference.
		forms_control_guide["slot"]["nav"].push([ns+"guide_button_"+"contents", undefined, "contents"]);
	} catch(error) {
		log(String(error));
		log(error.stack);		
	}		
};

function make_slots_book_page(player) {
	// Introspect the player's inventory, creating a list of buttons. Each represents an inventory Item
	try {
		forms_control_guide["slots"]["nav"] = [];
		let inv = player.getComponent( 'inventory' ).container;
		for(let slot = 0; slot < inv.size; slot++) {
			let itm = inv.getItem(slot)
			if(itm) {
				// make a button!
				let name = itm.typeId;
				if(itm.name) {
					name += " ("+itm.name+")";
				}
				log(String(slot)+" "+name);
				let result = [String(slot)+"> "+name, undefined, "slot_"+String(slot)]
				forms_control_guide["slots"]["nav"].push(result);
			};
		};
		forms_control_guide["slots"]["nav"].push([ns+"guide_button_"+"contents", undefined, "contents"]);
	} catch(error) {
		log(String(error));
		log(error.stack);		
	}	
};

function make_show_template_page(player) {
	// Shows what properties are set without changing any of them. 2024-08-06
	try {
		let result = "Here are the current settings for the Item Forge.\n\n";

		let val = player.getDynamicProperty(ns+"_item_type");
		if(val) {
			result += "§o§6Type:§r §5"+String(item_type_array[val]) + "§r\n";
		}
		
		let props = [
			{title: "Damage: ", value: "_item_damage"},
			{title: "Description:", value: "_item_description"},
			{title: "History: ", value: "_item_history"},
			{title: "Notes: ", value: "_item_notes"},
			{title: "Owner: ", value: "_item_owner"},
			{title: "Can Place On: ", value: "_can_place_on"},
			{title: "Can Destroy: ", value: "_can_destroy"},
			
		];
		
		for(let row of props) {
			let val = player.getDynamicProperty(ns+row.value);
			if(val && (String(val).replaceAll(/\s/g,'').length > 0)) {
				result += "§o§6"+row.title+"§r\n"+String(val) + "\n";
			}
		}

		let ench1 =  player.getDynamicProperty(ns+"_item_enchant1");
		let ench1lvl =  player.getDynamicProperty(ns+"_item_enchant1_level");
		let ench2 =  player.getDynamicProperty(ns+"_item_enchant2");
		let ench2lvl =  player.getDynamicProperty(ns+"_item_enchant2_level");
		let ench3 =  player.getDynamicProperty(ns+"_item_enchant3");
		let ench3lvl =  player.getDynamicProperty(ns+"_item_enchant3_level");	

		let enchanted = false

		if(ench1 !== undefined && ench1lvl != undefined) {
			if(!enchanted) {
				enchanted = true;
				result += "§o§6Enchantments:§r\n";
			}
			result += String(ench1).replaceAll('_',' ').replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) + "§o level "+String(ench1lvl)+"§r\n";
		}

		if(ench2 !== undefined && ench2lvl != undefined) {
			if(!enchanted) {
				enchanted = true;
				result += "§o§6Enchantments:§r\n";
			}
			result += String(ench2).replaceAll('_',' ').replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) + "§o level "+String(ench2lvl)+"§r\n";
		}

		if(ench3 !== undefined && ench3lvl != undefined) {
			if(!enchanted) {
				enchanted = true;
				result += "§o§6Enchantments:§r\n";
			}
			result += String(ench3).replaceAll('_',' ').replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) + "§o level "+String(ench3lvl)+"§r\n";
		}

		forms_control_guide["show_template"]["body"] = result;	
	} catch(error) {
		log(String(error));
		log(error.stack);		
	}
};

function make_can_place_on_book_page(player) {
	try {
		forms_control_guide["can_place_on"] = {
			type : 'controls',
			cache : true,
			title : ns+"guide_form_can_place_on_title",
			controls: [
			],
			nav : "contents",
			run_after : unpack_can_place_on
		};

		for(let blockid of block_type_array) {
			forms_control_guide["can_place_on"]["controls"].push(
					['player', 'bool', ns+"cpo"+blockid, blockid, false]
			);
		};
		
	} catch(error) {
		log(String(error));
		log(error.stack);
	}
};

function unpack_can_place_on(player) {
	player.setDynamicProperty(ns+"_can_place_on", undefined);
	let result = '';
	let val = undefined;
	for(let blockid of block_type_array) {
		val = player.getDynamicProperty(ns+"cpo"+blockid);
		if(val && val == true) {
			result += blockid + ',';
		};
	};
	player.setDynamicProperty(ns+"_can_place_on", result);
	// log(player.getDynamicProperty(ns+"_can_place_on"));
};

function unpack_can_destroy(player) {
	player.setDynamicProperty(ns+"_can_destroy", undefined);
	let result = '';
	let val = undefined;
	for(let blockid of block_type_array) {
		val = player.getDynamicProperty(ns+"cd"+blockid);
		if(val && val == true) {
			result += blockid + ',';
		};
	};
	player.setDynamicProperty(ns+"_can_destroy", result);
	// log(player.getDynamicProperty(ns+"_can_destroy"));	
};

function make_can_destroy_book_page(player) {
	try {
		forms_control_guide["can_destroy"] = {
			type : 'controls',
			cache : true,
			title : ns+"guide_form_can_destroy_title",
			controls: [
			],
			nav : "contents",
			run_after : unpack_can_destroy
		};

		for(let blockid of block_type_array) {
			forms_control_guide["can_destroy"]["controls"].push(
					['player', 'bool', ns+"cd"+blockid, blockid, false]
			);
		};
	} catch(error) {
		log(String(error));
		log(error.stack);
	}
};


function make_item_enchants_book_page(item_type, valid_enchants) {
	// create a page that shows only the valid enchantments for this item as selectable Checkboxes
	if(valid_enchants && valid_enchants.length > 0) {
		forms_control_guide["enchant_editor"] = {
			type : 'controls',
			cache : false,
			title : ns+"guide_form_enchant_editor_title",
			controls: [
			],
			nav : "contents",
			run_after : unpack_enchants_ui
		};

		for(let enchant of valid_enchants) {
			forms_control_guide["enchant_editor"]["controls"].push(
					['player', 'bool', ns+"_"+enchant.enchantment+String(enchant.level), enchant.enchantment.replaceAll('_',' ').replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();})+"§o§6 level "+String(enchant.level)+"§r", false]
			);
		};
	} else {
		forms_control_guide["enchant_editor"] = {
			type : 'buttons',
			cache : false,
			title : ns+"guide_form_enchant_editor_title",
			body : ns+"guide_form_enchant_editor_body",
			nav : [ns+"guide_button_contents", undefined, contents]
		};
	};
};

function refresh_enchants_ui(player) {
	let type = item_type_array[player.getDynamicProperty(ns+"_item_type")];
	let valid_enchants = test_enchantments(type);
	make_item_enchants_book_page(type, valid_enchants);
	
	// Clear all the enchant selections on the player.
	//for(let enchant in enchantments) {
	//	for(let i = 1; i <= MAX_ENCHANT_LEVEL; i++) {
	//		player.setDynamicProperty(ns+"_"+enchantments[enchant]+String(i), undefined);
	//	};
	//};

	// log(player.getDynamicPropertyIds());
	// log(player.getDynamicPropertyTotalByteCount());
}

function unpack_enchants_ui(player) {
	// log("unpack_enchants_ui");
	// There are a range of settings on the player that need to be translated into up to 3 enchant properties
	player.setDynamicProperty(ns+"_item_enchant1", undefined);
	player.setDynamicProperty(ns+"_item_enchant1_level", undefined);
	player.setDynamicProperty(ns+"_item_enchant2", undefined);
	player.setDynamicProperty(ns+"_item_enchant2_level", undefined);
	player.setDynamicProperty(ns+"_item_enchant3", undefined);
	player.setDynamicProperty(ns+"_item_enchant3_level", undefined);

	let type = item_type_array[player.getDynamicProperty(ns+"_item_type")];
	let valid_enchants = test_enchantments(type);

	let index = 1;

	for(let enchant of valid_enchants) {
		// log(enchant)
		// log(player.getDynamicProperty(ns+"_"+enchant.enchantment+String(enchant.level)));
		if( player.getDynamicProperty(ns+"_"+enchant.enchantment+String(enchant.level)) == true && index <= MAX_NUM_ITEM_ENCHANTS ) {
			// log(index)
			try {
				player.setDynamicProperty(ns+"_item_enchant"+String(index), enchant.enchantment);
				player.setDynamicProperty(ns+"_item_enchant"+String(index)+"_level", enchant.level);
				// log(player.getDynamicProperty(ns+"_item_enchant"+String(index)))
				// log(player.getDynamicProperty(ns+"_item_enchant"+String(index)+"_level"))
				index ++;
			} catch(error) {
				// log(String(error))
				// log(error.stack)
			};
		};
	};	
};

function generate_random_items(player) {
	let num_items = 1 + Math.floor(Math.random() * 36)
	
	for(let i = 0; i < num_items; i++) {
		generate_random_item(player)
	};
};

function generate_random_item(player) {

	try {
		let type = item_type_array[Math.floor(Math.random() * item_type_array.length)];

		let valid_enchants = test_enchantments(type);

		let num_enchants = Math.floor(Math.random() * MAX_NUM_ITEM_ENCHANTS);
		
		let description = "DESCRIPTION"
		let ihistory = "HISTORY"
		let notes = "NOTES"
		let owner = "OWNER"
		let name = "NAME"
		let durability = Math.floor(Math.random() * 255)
		let damage = Math.floor(Math.random() * 255)

		const item = new mc.ItemStack(type, 1);
		
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

		if(num_enchants > 0) {
			const enchantment = item.getComponent("minecraft:enchantable");
			if (enchantment) {
				for(let i = 0; i < num_enchants; i++) {
					let ench = valid_enchants[Math.floor(Math.random() * valid_enchants.length)]
					if(ench.enchantment !== undefined && ench.enchantment !== "none" && ench.level != undefined) {
						try {
							enchantment.addEnchantment({ type: new mc.EnchantmentType(ench.enchantment), level: ench.level });
						} catch (error) {
							log("Warning applying enchantment: "+String(error));
						}
					}
				}
			};
		};
		twfname.make_item_metatext(item, player);

		log("Smithing a new "+String(item.typeId));
		player.dimension.spawnItem(item, {x: player.location.x, y: player.location.y, z:player.location.z});
	} catch(error) {
		log(String(error));
		log(error.stack);
	};
};

const static_items = [ 
	["twf_itm:guide", 1],
	["twf_itm:smith", 1] 
];

twfui.show_forms_on_item_use({
	itemTypeId: "twf_itm:guide",
	forms_control: forms_control_guide,
	project_global_settings: project_global_settings,
	sound_open: "random.chestopen",
	sound_flag: "LT_SOUNDS_SETTING",
	item_top_up: static_items,
	item_top_up_flag: "LT_EQUIP_SETTING"
});

function give_spawn_item(player, itemTypeId, qty, name) {
	const initialised_on_spawn = itemTypeId + '_init';	
	if(player.getDynamicProperty(initialised_on_spawn) === undefined) {
		var item = new mc.ItemStack(itemTypeId, qty);
		item.nameTag = name;
		player.dimension.spawnItem(item, player.location);
		player.setDynamicProperty(initialised_on_spawn, 1);
		player.setDynamicProperty(project_global_settings["PLAYER_SETTING_KEYS"]["LT_SOUNDS_SETTING"], true);
		player.setDynamicProperty(project_global_settings["PLAYER_SETTING_KEYS"]["LT_EQUIP_SETTING"], true);
	}
};

const BOOK_ID = "twf_itm:guide";
const LT_NAME_GUIDE = "§l§eThe Item Editor§r";

mc.world.afterEvents.playerSpawn.subscribe(event => {
	const players = mc.world.getPlayers( { playerId: event.playerId } );
	for ( let player of players ) {
		give_spawn_item(player, BOOK_ID, 1, LT_NAME_GUIDE);		
	}
});


function give_item(player) {
	try {
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
			try {
				item.setLore(lore);
			} catch (error) {
				log(String(error));
				log(error.stack);				
			}
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

			const enchantment = item.getComponent("minecraft:enchantable");
			if(project_global_settings["DEBUG"]) player.sendMessage("Enchanting " +JSON.stringify(enchantment, undefined, 2));
			if (enchantment) {
				let ench1 =  player.getDynamicProperty(ns+"_item_enchant1");
				let ench1lvl =  player.getDynamicProperty(ns+"_item_enchant1_level");
				let ench2 =  player.getDynamicProperty(ns+"_item_enchant2");
				let ench2lvl =  player.getDynamicProperty(ns+"_item_enchant2_level");
				let ench3 =  player.getDynamicProperty(ns+"_item_enchant3");
				let ench3lvl =  player.getDynamicProperty(ns+"_item_enchant3_level");

				if(ench1 !== undefined && ench1lvl != undefined) {
					try {
						// log("Enchantment 1 added "+ench1+" "+String(ench1lvl));
						enchantment.addEnchantment({ type: new mc.EnchantmentType(ench1), level: ench1lvl });
					} catch (error) {
						log("Warning applying enchantment 1: "+String(error));
					}
					if(ench2 !== undefined && ench2lvl != undefined) {
						try {
							// log("Enchantment 1 added "+ench2+" "+String(ench2lvl));
							enchantment.addEnchantment({ type: new mc.EnchantmentType(ench2), level: ench2lvl });
						} catch(error) {
							log("Warning applying enchantment 2: "+String(error));
						}
						if(ench3 !== undefined && ench3lvl != undefined) {
							try {
								// log("Enchantment 3 added "+ench3+" "+String(ench3lvl));
								enchantment.addEnchantment({type: new mc.EnchantmentType(ench3), level: ench3lvl });
							} catch(error) {
								log("Warning applying enchantment 3: "+String(error));
							}
						}
					}
				}
			};
			
			try {
				let cpo = player.getDynamicProperty(ns+"_can_place_on");
				log(cpo);
				if(cpo) {
					let cpo_list = cpo.split(',');
					if(cpo_list.length>0){
						let interim = [];
						for(let c of cpo_list) {
							if(c.length > 1) {
								interim.push(c);
							}
						}
						item.setCanPlaceOn(interim);
					};
				}
				
				let cd = player.getDynamicProperty(ns+"_can_destroy");
				log(cd);
				if(cd) {
					let cd_list = cd.split(',');
					if(cd_list.length>0){
						let interim = [];
						for(let c of cd_list) {
							if(c.length > 1) {
								interim.push(c);
							}
						}
						item.setCanDestroy(interim);
					};
				}
			} catch(error) {
				log(String(error));
				log(error.stack);
			}
			
			log("Smithing a new "+String(item.typeId));
			player.dimension.spawnItem(item, player.location);
		};
	} catch(error) {
		log(String(error));
		log(error.stack);
	}
	
};

mc.world.afterEvents.itemUse.subscribe(async (event) => {
        const { source: player, itemStack } = event;
        if (itemStack.typeId === "twf_itm:smith") {
			give_item(player);
        };
    });


