import * as mc from "@minecraft/server";
import * as mcui from "@minecraft/server-ui"


const icon_lookup = {
	// "item": "textures/twf/bmt/items/item.png"
};


const info_forms_simple_contents = [
	["contents", ["slots_inst", "item_editor", "show_template_inst", "smith", "can_place_on_inst", "can_destroy_inst", "generate_intro", "generate_items_intro"  ]],
	["item_selector", ["weapons", "armour", "tools", "contents"]],
	["weapons", ["item_editor_inst", "swords", "axes", "ranged", "contents"]],
	["armour", ["helmets", "chestplate", "leggings", "boots"]],
	["tools", ["pickaxes", "axes", "shovels", "contents"]],
	["item_editor_inst", ["contents", "item_editor"]],
	["check_inventory", ["contents"]],
	
	["enchant_editor_inst", ["contents", "enchant_editor"]],


//	["craft", ["contents"]],
//	["howto", ["contents"]],
//	["settings_inst", ["contents","settings"]],
	["settings", ["contents"]]
]

function init_forms(forms_control_guide, ns) {

	for(let i in info_forms_simple_contents) {
		let buttn = info_forms_simple_contents[i];
		
		let name = buttn[0];
		let icon = icon_lookup[name];

		forms_control_guide[name] = {
			type : 'buttons',
			cache : true,
			title : ns+"guide_form_"+name+"_title" ,
			body : ns+"guide_form_"+name+"_body" ,
			nav : []
		}
		
		if(info_forms_simple_contents[i].length > 1) {
			for(let j in info_forms_simple_contents[i][1]) {
				let subform = info_forms_simple_contents[i][1][j];
				forms_control_guide[name]["nav"].push([ns+"guide_button_"+subform, icon_lookup[subform], subform]);
			}
		};
	}
	
	forms_control_guide["item_editor_inst"]["type"] = "yesno";  // I want this to warn/instruct
	forms_control_guide["enchant_editor_inst"]["type"] = "yesno";
	forms_control_guide["contents"]["nav"].push([ns+"guide_exit" , undefined, undefined]);
	
};

export { init_forms };