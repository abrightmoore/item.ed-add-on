import * as mc from "@minecraft/server";
import * as mcui from "@minecraft/server-ui";
import * as twfguide from "./guide";
import * as twfui from "./libs/twfui";

// @TheWorldFoundry

/*
	2024-06-03 Initial - Item editor
	2024-07-19 Revise for enchants
*/

/*  PROJECT NAMESPACE  */
const studio = 'twf'
const project = 'itm'
const ns = studio+"_"+project+":"
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

let forms_control_guide = {
	cache : {},	
	start : "contents",
	
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
		nav : "enchant_editor_inst"
	},

	
	enchant_editor : { // Waiting on 1.21
		type : 'controls',
		cache : false,
		title : ns+"guide_form_enchant_editor_title",
		controls: [
			['player', 'select', ns+"_item_enchant1", ns+"guide_form_settings_item_enchant1", 0, enchantments],
			['player', 'slider', ns+"_item_enchant1_level", ns+"guide_form_settings_item_enchant1_level", 1, 1, 5, 1],
			['player', 'select', ns+"_item_enchant2", ns+"guide_form_settings_item_enchant2", 0, enchantments],
			['player', 'slider', ns+"_item_enchant2_level", ns+"guide_form_settings_item_enchant2_level", 1, 1, 5, 1],
			['player', 'select', ns+"_item_enchant3", ns+"guide_form_settings_item_enchant3", 0, enchantments],
			['player', 'slider', ns+"_item_enchant3_level", ns+"guide_form_settings_item_enchant3_level", 1, 1, 5, 1]
		],
		nav : "contents"
	}
};

twfguide.init_forms(forms_control_guide, ns);

/* Game loop handling
*/

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


mc.world.afterEvents.itemUse.subscribe(async (event) => {
        const { source: player, itemStack } = event;
        if (itemStack.typeId === "twf_itm:smith") {
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
				


				const enchantment = item.getComponent("minecraft:enchantable");
				if(project_global_settings["DEBUG"]) player.sendMessage("Enchanting " +JSON.stringify(enchantment, undefined, 2));
				if (enchantment) {
					let ench1 =  player.getDynamicProperty(ns+"_item_enchant1");
					let ench1lvl =  player.getDynamicProperty(ns+"_item_enchant1_level");
					let ench2 =  player.getDynamicProperty(ns+"_item_enchant2");
					let ench2lvl =  player.getDynamicProperty(ns+"_item_enchant2_level");
					let ench3 =  player.getDynamicProperty(ns+"_item_enchant3");
					let ench3lvl =  player.getDynamicProperty(ns+"_item_enchant3_level");
					if(ench1 !== undefined && ench1 > 0 && ench1lvl != undefined) {
						try {
							enchantment.addEnchantment({ type: new mc.EnchantmentType(enchantments[ench1]), level: ench1lvl });
						} catch (error) {
							mc.world.sendMessage("Warning applying enchantment 1: "+error);
						}
						if(ench2 !== undefined && ench2 > 0 && ench2lvl != undefined) {
							try {
								enchantment.addEnchantment({ type: new mc.EnchantmentType(enchantments[ench2]), level: ench2lvl });
							} catch(error) {
								mc.world.sendMessage("Warning applying enchantment 2: "+error);
							}
							if(ench3 !== undefined && ench3 > 0 && ench3lvl != undefined) {
								try {
									enchantment.addEnchantment({type: new mc.EnchantmentType(enchantments[ench3]), level: ench3lvl });
								} catch(error) {
									mc.world.sendMessage("Warning applying enchantment 3: "+error);
								}
							}
						}
					}
				};

				player.dimension.spawnItem(item, player.location);
			};
        };
    });
