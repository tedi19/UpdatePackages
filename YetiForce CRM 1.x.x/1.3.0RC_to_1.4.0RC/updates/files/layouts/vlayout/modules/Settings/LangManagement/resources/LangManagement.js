/*+***********************************************************************************************************************************
 * The contents of this file are subject to the YetiForce Public License Version 1.1 (the "License"); you may not use this file except
 * in compliance with the License.
 * Software distributed under the License is distributed on an "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and limitations under the License.
 * The Original Code is YetiForce.
 * The Initial Developer of the Original Code is YetiForce. Portions created by YetiForce are Copyright (C) www.yetiforce.com. 
 * All Rights Reserved.
 *************************************************************************************************************************************/
var Settings_Index_Js = {
	initEvants: function() {
		$('.LangManagement .add_lang').click(Settings_Index_Js.ShowLangMondal);
		$('.LangManagement .edit_lang a').click(function(e){jQuery('#edit_lang').html('');document.showDiff=false; Settings_Index_Js.LoadEditLang(this)});
		$('.LangManagement .editHelpIcon a').click(function(e){ jQuery('#editHelpIcon').html('');document.showDiff=false; Settings_Index_Js.LoadEditLang(this)});
		$('#AddNewLangMondal .btn-primary').click(Settings_Index_Js.AddLangMondal);
		$('#AddNewTranslationMondal .btn-primary').click(Settings_Index_Js.AddTranslationMondal);
		$('#lang_list tr').each(function(index,element){
			element = $(element);
			Settings_Index_Js.initEvant(element);
		})
	},
	LoadEditLang : function(e) {
		element = jQuery(e);
		position = element.attr('href');
		var tpl = element.data('mode');
		if(typeof position == 'undefined'){
			position = '#'+element.attr('id');
		}
		var progress = $.progressIndicator({
			'message' : app.vtranslate('LBL_Loader'),
			'position' : position,
			'blockInfo' : {
				'enabled' : true
			}
		});
		var url = '';
		if($(".LangManagement "+position+" #langs_list").val() != undefined){
			url += '&lang='+$(".LangManagement "+position+" #langs_list").val();
		}
		if($(".LangManagement #mods_list").val() != undefined){
			url += '&mod='+$(".LangManagement "+position+" #mods_list").val();
		}
		if(document.showDiff == true){
			url += '&sd=1';
		}
		if(typeof tpl != 'undefined'){
			url += '&tpl='+tpl;
		}
		$.get("index.php?module=LangManagement&parent=Settings&view=Edit"+url, function (data) {
			jQuery(position).html(data);
			Settings_Index_Js.initEditLang(tpl,position);
			progress.progressIndicator({'mode': 'hide'});
		});
	},
	initEditLang: function(tpl,position) {
		var thisInstance = this;
		app.showSelect2ElementView($(".LangManagement .active select.chzn-select"));
		$(".LangManagement .active #langs_list").select2().on("change", function(e) {
			e = jQuery(this).closest('.active');
			Settings_Index_Js.LoadEditLang(e);
        });
		thisInstance.registerHoverCkEditor();
		thisInstance.registerHelpInfo();
		
		$(".LangManagement .active #helpInfoView").on('change',function(e){Settings_Index_Js.saveView(e,position)})
		$(".LangManagement .active #mods_list").select2().on("change", function(e) {
			e = jQuery(this).closest('.active');
			Settings_Index_Js.LoadEditLang(e);
        });
		if(tpl != 'editHelpIcon'){
			$('#edit_lang .translation').change(function(e){Settings_Index_Js.changeTranslation(e,position)});
			$('#edit_lang .add_translation').click(Settings_Index_Js.ShowTranslationMondal);
			$('#edit_lang .delete_translation').click(function(e){Settings_Index_Js.deleteTranslation(e,position)});
		}
		$('.LangManagement '+position+' .show_differences').click(Settings_Index_Js.ShowDifferences);
		$.extend( $.fn.dataTable.defaults, {
			"searching": true,
			"ordering": false,
			"bFilter" : false,               
			"bLengthChange": false,
			"bPaginate": false,
			"bInfo": false,
			"pageLength": -1,
			"language": {
				"sZeroRecords":   app.vtranslate('No matching records found'),
				"sSearch":        app.vtranslate('Search'),
				"sEmptyTable":    app.vtranslate('No data available in table'),
			}
		} );
		$(''+position+' .listViewEntriesTable').dataTable();
	},
	registerHoverCkEditor : function(){
		var thisInstance = this;
		jQuery('tr td button.editButton').on('click',function(e){
			elementTd = jQuery(this).closest('td');
			thisInstance.registerEventForCkEditor(this);
			thisInstance.addClickOutSideEvent(elementTd);
		});
	},
	addClickOutSideEvent : function(element) {
		var thisInstance = this;
		element.one('clickoutside',function(){
			thisInstance.destroyEventForCkEditor(element);
		});
	},
	registerHelpInfo : function(){
		var form = jQuery('.LangManagement');
		form.find('.HelpInfoPopover').popover()
	},
	/**
	 * Function to register event for ckeditor
	 */
	registerEventForCkEditor : function(e){
		var thisInstance = this;
		var element = jQuery(e);
		var elementTd = element.closest('td');
		var textarea = elementTd.find('textarea.ckEditorSource');
		element.addClass('hide');
		textarea.removeClass('hide');
		thisInstance.loadCkEditorElement( textarea );
	},
	/**
	 * Function to destroy ckeditor element
	 */
	destroyEventForCkEditor : function(element){
		var thisInstance = this;
		var textarea = element.find('textarea.ckEditorSource');
		var elementId = textarea.attr('id');
		if(typeof elementId != 'undefined' && textarea.css('display') == 'none'){
			ckeditor = CKEDITOR.instances[elementId];
			var target = ckeditor.getData();
			if(textarea.val() != target){
				textarea.val(target);
				if(target){
					Settings_Index_Js.changeTranslation(textarea,'#editHelpIcon');
					element.find('.HelpInfoPopover').attr('data-content',target);
				}else{
					Settings_Index_Js.deleteTranslation(textarea,'#editHelpIcon');
					textarea.addClass('empty_value');
					element.find('.HelpInfoPopover').attr('data-content','');
				}
			}
			ckeditor.destroy();
			textarea.addClass('hide');
			element.find('button.editButton').removeClass('hide');
		}
	},
	loadCkEditorElement : function( noteContentElement ){
		var thisInstance = this;
		var customConfig = {};
		if( noteContentElement.css('display') != 'none'){
			customConfig = {
				disableNativeSpellChecker: true,
				scayt_autoStartup: false,
				removePlugins: 'scayt',
				height: '5em',
				toolbar: null, 
				toolbarGroups: [                 
					{ name: 'document', groups: [ 'mode', 'document', 'doctools' ] },
					{ name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
					{ name: 'clipboard', groups: [ 'clipboard', 'undo' ] }
				]}
			var ckEditorInstance = new Vtiger_CkEditor_Js();
			ckEditorInstance.loadCkEditor(noteContentElement,customConfig);
		}
	},
	saveView: function(e, position) {
		var target = $(e.currentTarget);
		if(typeof e.currentTarget == 'undefined')
			target = jQuery(e);
		var closestTrElement = target.closest('tr');
		var progress = $.progressIndicator({
			'message' : app.vtranslate('LBL_Loader'),
			'position' : position,
			'blockInfo' : {
				'enabled' : true
			}
		});
		var SaveEvent = Settings_Index_Js.registerSaveEvent('saveView',{
			'fieldid':target.data('fieldid'),
			'mod':$(".LangManagement #mods_list").data('target')?$(".LangManagement #mods_list").data('target'):$(".LangManagement #mods_list").val(),
			'value':target.val(),
		});
		progress.progressIndicator({'mode': 'hide'});
	},
	ShowDifferences: function(e) {
		var target = $(e.currentTarget);
		if ($(this).is(':checked')) {
			document.showDiff = true;
		}else{
			document.showDiff = false;
		}
		e = $(this).closest('.active');
		Settings_Index_Js.LoadEditLang(e);
	},
	changeTranslation: function(e, position) {

		var target = $(e.currentTarget);
		if(typeof e.currentTarget == 'undefined')
			target = jQuery(e);
		var closestTrElement = target.closest('tr');
		var progress = $.progressIndicator({
			'message' : app.vtranslate('LBL_Loader'),
			'position' : position,
			'blockInfo' : {
				'enabled' : true
			}
		});
		Settings_Index_Js.registerSaveEvent('SaveTranslation',{
			'lang':target.data('lang'),
			'mod':jQuery(".LangManagement "+position+" #mods_list").data('target')?jQuery(".LangManagement "+position+" #mods_list").data('target'):jQuery(".LangManagement "+position+" #mods_list").val(),
			'type':target.data('type'),
			'langkey':closestTrElement.data('langkey'),
			'val':target.val(),
			'is_new':target.hasClass( "empty_value" ),
		});
		target.removeClass( "empty_value" );
		progress.progressIndicator({'mode': 'hide'});
	},
	deleteTranslation: function(e,position) {
		var target = $(e.currentTarget);
		if(typeof e.currentTarget == 'undefined'){
			target = e;
		}
		var closestTrElement = target.closest('tr');
		var progress = $.progressIndicator({
			'message' : app.vtranslate('LBL_Loader'),
			'position' : position,
			'blockInfo' : {
				'enabled' : true
			}
		});
		Settings_Index_Js.registerSaveEvent('DeleteTranslation',{
			'lang':$(".LangManagement #langs_list").val(),
			'mod':$(".LangManagement "+position+" #mods_list").data('target')?$(".LangManagement "+position+" #mods_list").data('target'):$(".LangManagement "+position+" #mods_list").val(),
			'langkey':closestTrElement.data('langkey'),
		});
		progress.progressIndicator({'mode': 'hide'});
		e = target.closest('.active');
		Settings_Index_Js.LoadEditLang(e);
	},
	initEvant: function(element) {
		element.find('input[type=checkbox]').change(Settings_Index_Js.CheckboxChange);
		var options = {
			title : app.vtranslate('LBL_AreYouSure'),
			trigger : 'manual',
			placement: 'left',
			content: '<div class="popover_block"><button class="btn btn-danger deleteItem">'+app.vtranslate('Delete')+'</button>   <button class="btn btn-success pull-right cancel">'+app.vtranslate('Cancel')+'</button></div>'
		}
		var makeSureOptions = {
			title : app.vtranslate('JS_ARE_YOU_SURE_TO_SET_AS_DEFAULT'),
			trigger : 'manual',
			placement: 'left',
			content: '<div class="popover_block"><button class="btn btn-danger setDefaultItem">'+app.vtranslate('LBL_YES')+'</button>   <button class="btn btn-success pull-right cancel">'+app.vtranslate('Cancel')+'</button></div>'
		}
		element.find('#deleteItemC').click(function(e) {
			$(e.currentTarget).popover(options).popover('show');
			$('.popover_block .deleteItem').click(function() {
				Settings_Index_Js.DeleteLang(element,e);
				$(e.currentTarget).popover('hide');
			});
			$('.popover_block .cancel').click(function() {
				$(e.currentTarget).popover('hide');
			});
		});
		element.find('#setAsDefault').click(function(e) {
			$(e.currentTarget).popover(makeSureOptions).popover('show');
			$('.popover_block .setDefaultItem').click(function() {
				$(e.currentTarget).popover('hide');
				Settings_Index_Js.setAsDefaultLang(element,e);
			});
			$('.popover_block .cancel').click(function() {
				$(e.currentTarget).popover('hide');
			});
		});
	},
	CheckboxChange: function(e) {
		var target = $(e.currentTarget);
		var closestTrElement = target.closest('tr');
		Settings_Index_Js.registerSaveEvent('save',{'type':'Checkbox','name':target.data('name'),'prefix':closestTrElement.data('prefix'),'val':target.is(':checked')});
	},
	ShowLangMondal: function(e) {
		var target = $(e.currentTarget);
		$('#AddNewLangMondal').modal('show');
		$("#AddNewLangMondal").css("z-index", "9999999");
	},
	ShowTranslationMondal: function(e) {
		var langs_list = $(".LangManagement #langs_list").val();
		var langs_fields = '';
		$('#AddNewTranslationMondal input[name="langs"]').val(JSON.stringify(langs_list));
		$.each(langs_list, function(key) {
			langs_fields += '<div class="span5 marginLeftZero"><label class="">'+langs_list[key]+':</label></div><div class="span7"><input name="'+langs_list[key]+'" class="span3" type="text" /></div>';
		});
		$('#AddNewTranslationMondal .add_translation_block').html(langs_fields);
		var target = $(e.currentTarget);
		$('#AddNewTranslationMondal').modal('show');
		$("#AddNewTranslationMondal").css("z-index", "9999999");
	},
	AddLangMondal: function(e) {
		var SaveEvent = Settings_Index_Js.registerSaveEvent('add',{
			'type':'Add',
			'label':$("#AddNewLangMondal input[name='label']").val(),
			'name':$("#AddNewLangMondal input[name='name']").val(),
			'prefix':$("#AddNewLangMondal input[name='prefix']").val()
		});
		if(SaveEvent.resp){
			$('#lang_list table tbody').append('<tr data-prefix="'+SaveEvent.params.prefix+'"><td>'+SaveEvent.params.label+'</td><td>'+SaveEvent.params.name+'</td><td>'+SaveEvent.params.prefix+'</td><td class="textAlignCenter"><input type="checkbox" data-name="ac_user"></td><td class="textAlignCenter"><input type="checkbox" data-name="ac_admin"></td><td><button class="btn btn-danger marginLeftZero" data-toggle="confirmation" data-original-title="" id="deleteItemC">'+app.vtranslate('Delete')+'</button></td></tr>');
			var element = $('#lang_list tr[data-prefix='+SaveEvent.params.prefix+']')
			Settings_Index_Js.initEvant(element);
			$('#AddNewLangMondal').modal('hide');
			$("#AddNewLangMondal input[name='label']").val('');
			$("#AddNewLangMondal input[name='name']").val('');
			$("#AddNewLangMondal input[name='prefix']").val('');
		}
	},
	AddTranslationMondal: function(e) {
		var target = $(e.currentTarget);
		var SaveEvent = Settings_Index_Js.registerSaveEvent('AddTranslation',{
			'mod': $(".LangManagement #mods_list").val(),
			'form_data': $("#AddTranslationForm").serializeFormData()
		});
		if(SaveEvent.resp){
			$('#AddNewTranslationMondal').modal('hide');
			$("#AddNewTranslationMondal input[name='variable']").val('');
		}
		Settings_Index_Js.LoadEditLang(jQuery('#edit_lang'));
		e.preventDefault();
	},
	DeleteLang: function(closestTrElement,e) {
		Settings_Index_Js.registerSaveEvent('delete',{'prefix':closestTrElement.data('prefix')});
		closestTrElement.hide();
	},
	setAsDefaultLang: function(closestTrElement,e) {
		var SaveEvent = Settings_Index_Js.registerSaveEvent('setAsDefault',{'prefix':closestTrElement.data('prefix')});
		$(e.currentTarget).closest('td').find('#deleteItemC').remove();
		$(e.currentTarget).remove();
		var prefix = SaveEvent.result['prefixOld'];
		var tbodyElement = closestTrElement.closest('tbody');
		OldTrDefaultLang = tbodyElement.find('tr[data-prefix="'+prefix+'"]')
		OldTrDefaultLang.find('td:last').prepend('<button class="btn btn-danger marginLeftZero" data-toggle="confirmation" data-original-title="" id="deleteItemC">'+app.vtranslate('Delete')+'</button> <button class="btn btn-primary marginLeftZero" data-toggle="confirmation" id="setAsDefault">'+app.vtranslate('JS_DEFAULT')+'</button>');
		Settings_Index_Js.initEvant(OldTrDefaultLang);
	},
	registerSaveEvent: function(mode, data) {
		var response = '';
		var resp = '';
		var params = {}
		params.data = {
			module: app.getModuleName(), 
			parent: app.getParentModuleName(), 
			action: 'SaveAjax', 
			mode: mode,
			params: data
		}
		params.async = false;
		params.dataType = 'json';
        AppConnector.request(params).then(
			function(data) {
				response = data['result'];
				var params = {
					text: response['message'],
					animation: 'show'
				};
				if(response['success'] == true){
					params.type = 'info';
				}
				Vtiger_Helper_Js.showPnotify(params);
				resp = response['success'];
			},
			function(data, err) {

			}
        );
		return {resp:resp,params:params.data.params,result:response};
	},

	registerEvents : function() {
		Settings_Index_Js.initEvants();
	}
	
}
$(document).ready(function(){
	document.showDiff = false;
	Settings_Index_Js.registerEvents();
})