import * as mc from "@minecraft/server";

const naming_strategies = [
	player_item_name
]

function player_item_name(item, player) {
	let lore = [];
	let name = undefined;

	if(player.name) {
		name = player.name + '\'';
		if(!(name.endsWith("s") || name.endsWith("z"))) {
			name = name + 's';
		};
	}
	
	let item_type = item.typeId.replace('minecraft:', '').replace(':','').replaceAll('_',' ').replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});

	name = name+' '+item_type;

	return {
		name: name ,
		lore: lore
	};
};


function generate_lore(item, player) {
	// Adds lore to an item.
	
};

function make_item_metatext(item, player) {
	// Based on various strategies, fill out the name and lore of this item
	if(item) {
		let strategy = naming_strategies[Math.floor(Math.random() * naming_strategies.length)];

		let result = strategy(item, player);
		if(result) {
			if(result.name) {
				item.nameTag = result.name;
			}
			
			if(result.lore) {
				item.setLore(result.lore);
			}
		}
	}
};

const enchantments = [
	"none",
	"aqua_affinity",
	"bane_of_arthropods",
	"binding",
	"blast_protection",
	"breach",
	"channeling",
	"density",
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
	"vanishing",
	"wind_burst"
]

const enchantment_flair = [
	{e:"none", d: []},
	{e:"aqua_affinity", d: ["the depths"]},
	{e:"bane_of_arthropods", d: ["bugs", "insects", "crustaceans"]},
	{e:"binding", d: ["the tethered"]},
	{e:"blast_protection", d: ["the bunker"]},
	{e:"breach", d: []},
	{e:"channeling", d: []},
	{e:"density", d: []},
	{e:"depth_strider", d: []},
	{e:"efficiency", d: []},
	{e:"feather_falling", d: []},
	{e:"fire_aspect", d: []},
	{e:"fire_protection", d: []},
	{e:"flame", d: []},
	{e:"fortune", d: []},
	{e:"frost_walker", d: []},
	{e:"impaling", d: []},
	{e:"infinity", d: []},
	{e:"knockback", d: []},
	{e:"looting", d: []},
	{e:"loyalty", d: []},
	{e:"luck_of_the_sea", d: []},
	{e:"lure", d: []},
	{e:"mending", d: []},
	{e:"multishot", d: []},
	{e:"piercing", d: []},
	{e:"power", d: []},
	{e:"projectile_protection", d: []},
	{e:"protection", d: []},
	{e:"punch", d: []},
	{e:"quick_charge", d: []},
	{e:"respiration", d: []},
	{e:"riptide", d: []},
	{e:"sharpness", d: [""]},
	{e:"silk_touch", d: ["delicacy", "professionalism"]},
	{e:"smite", d: ["anger", "smashing", "ouchie"]},
	{e:"soul_speed", d: ["swift nether travel"]},
	{e:"swift_sneak", d: ["thieves", "the night"]},
	{e:"thorns", d: ["punctures", "holes", "spikes"]},
	{e:"unbreaking", d: ["hardness"]},
	{e:"vanishing", d: ["transparency"]},
	{e:"wind_burst", d: ["tornadoes","cyclones","gusting"]}
]

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

	"minecraft:chainmail_boots",
	"minecraft:chainmail_chestplate",
	"minecraft:chainmail_helmet",
	"minecraft:chainmail_leggings",

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
	"minecraft:crossbow",
	
	"minecraft:mace",
	"minecraft:trident",
	
	"minecraft:shears",
	
	"minecraft:elytra",
	
	"minecraft:flint_and_steel",
	
	"minecraft:shield",
	
	"minecraft:fishing_rod",
	"minecraft:carrot_on_a_stick",	
	"minecraft:warped_fungus_on_a_stick",
	
	"minecraft:book",
	
	"minecraft:turtle_helmet",
]

const block_type_array = [];
for(let lll of mc.BlockTypes.getAll()) {
	block_type_array.push(lll.id);
}
block_type_array.sort();

const lore_elements = {
	"shaped like": {
		
	}
	
};


export {  make_item_metatext as default, make_item_metatext, enchantments, item_type_array, block_type_array };