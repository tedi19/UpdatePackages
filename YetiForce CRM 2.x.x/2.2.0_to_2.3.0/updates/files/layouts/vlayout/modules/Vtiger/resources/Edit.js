/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 * Contributor(s): YetiForce.com
 *************************************************************************************/
jQuery.Class("Vtiger_Edit_Js", {
	//Event that will triggered when reference field is selected
	referenceSelectionEvent: 'Vtiger.Reference.Selection',
	//Event that will triggered when reference field is selected
	referenceDeSelectionEvent: 'Vtiger.Reference.DeSelection',
	//Event that will triggered before saving the record
	recordPreSave: 'Vtiger.Record.PreSave',
	refrenceMultiSelectionEvent: 'Vtiger.MultiReference.Selection',
	preReferencePopUpOpenEvent: 'Vtiger.Referece.Popup.Pre',
	editInstance: false,
	SaveResultInstance: false,
	postReferenceSelectionEvent: 'Vtiger.PostReference.Selection',
	/**
	 * Function to get Instance by name
	 * @params moduleName:-- Name of the module to create instance
	 */
	getInstanceByModuleName: function (moduleName) {
		if (typeof moduleName == "undefined") {
			moduleName = app.getModuleName();
		}
		var parentModule = app.getParentModuleName();
		if (parentModule == 'Settings') {
			var moduleClassName = parentModule + "_" + moduleName + "_Edit_Js";
			if (typeof window[moduleClassName] == 'undefined') {
				moduleClassName = moduleName + "_Edit_Js";
			}
			var fallbackClassName = parentModule + "_Vtiger_Edit_Js";
			if (typeof window[fallbackClassName] == 'undefined') {
				fallbackClassName = "Vtiger_Edit_Js";
			}
		} else {
			moduleClassName = moduleName + "_Edit_Js";
			fallbackClassName = "Vtiger_Edit_Js";
		}
		if (typeof window[moduleClassName] != 'undefined') {
			var instance = new window[moduleClassName]();
		} else {
			var instance = new window[fallbackClassName]();
		}
		return instance;
	},
	getInstance: function () {
		if (Vtiger_Edit_Js.editInstance == false) {
			var instance = Vtiger_Edit_Js.getInstanceByModuleName();
			Vtiger_Edit_Js.editInstance = instance;
			return instance;
		}
		return Vtiger_Edit_Js.editInstance;
	}

}, {
	addressDataOG: [],
	addressDataGM: [],
	formElement: false,
	relationOperation: '',
	getForm: function () {
		if (this.formElement == false) {
			this.setForm(jQuery('#EditView'));
		}
		return this.formElement;
	},
	setForm: function (element) {
		this.formElement = element;
		return this;
	},
	getPopUpParams: function (container) {
		var params = {};
		var sourceModule = app.getModuleName();
		var popupReferenceModule = jQuery('input[name="popupReferenceModule"]', container).val();
		var sourceFieldElement = jQuery('input[class="sourceField"]', container);
		var sourceField = sourceFieldElement.attr('name');
		var sourceRecordElement = jQuery('input[name="record"]');
		var sourceRecordId = '';
		if (sourceRecordElement.length > 0) {
			sourceRecordId = sourceRecordElement.val();
		}

		var isMultiple = false;
		if (sourceFieldElement.data('multiple') == true) {
			isMultiple = true;
		}

		var params = {
			'module': popupReferenceModule,
			'src_module': sourceModule,
			'src_field': sourceField,
			'src_record': sourceRecordId
		}

		if (isMultiple) {
			params.multi_select = true;
		}
		return params;
	},
	openPopUp: function (e) {
		var thisInstance = this;
		var parentElem = jQuery(e.target).closest('td');

		var params = this.getPopUpParams(parentElem);

		var isMultiple = false;
		if (params.multi_select) {
			isMultiple = true;
		}

		var sourceFieldElement = jQuery('input[class="sourceField"]', parentElem);

		var prePopupOpenEvent = jQuery.Event(Vtiger_Edit_Js.preReferencePopUpOpenEvent);
		sourceFieldElement.trigger(prePopupOpenEvent);

		if (prePopupOpenEvent.isDefaultPrevented()) {
			return;
		}

		var popupInstance = Vtiger_Popup_Js.getInstance();
		popupInstance.show(params, function (data) {
			var responseData = JSON.parse(data);
			var dataList = new Array();
			for (var id in responseData) {
				var data = {
					'name': responseData[id].name,
					'id': id
				}
				dataList.push(data);
				if (!isMultiple) {
					thisInstance.setReferenceFieldValue(parentElem, data);
				}
			}

			if (isMultiple) {
				sourceFieldElement.trigger(Vtiger_Edit_Js.refrenceMultiSelectionEvent, {'data': dataList});
			}
			sourceFieldElement.trigger(Vtiger_Edit_Js.postReferenceSelectionEvent, {'data': responseData});
		});
	},
	setReferenceFieldValue: function (container, params) {
		var thisInstance = this;
		var sourceField = container.find('input.sourceField').attr('name');
		var fieldElement = container.find('input[name="' + sourceField + '"]');
		var sourceFieldDisplay = sourceField + "_display";
		var fieldDisplayElement = container.find('input[name="' + sourceFieldDisplay + '"]');
		var popupReferenceModule = container.find('input[name="popupReferenceModule"]').val();

		var selectedName = params.name;
		var id = params.id;

		fieldElement.val(id)
		fieldDisplayElement.val(selectedName).attr('readonly', true);
		fieldElement.trigger(Vtiger_Edit_Js.referenceSelectionEvent, {'source_module': popupReferenceModule, 'record': id, 'selectedName': selectedName});

		fieldDisplayElement.validationEngine('closePrompt', fieldDisplayElement);
		var formElement = container.closest('form');
		var mappingRelatedField = this.getMappingRelatedField(sourceField, popupReferenceModule, formElement);
		if (typeof mappingRelatedField != undefined) {
			var data = {
				'source_module': popupReferenceModule, 'record': id
			};
			this.getRecordDetails(data).then(
					function (data) {
						var response = data['result']['data'];
						$.each(mappingRelatedField, function (key, value) {
							if (response[value[0]] != 0 && !thisInstance.getMappingValuesFromUrl(key)) {
								var mapFieldElement = formElement.find('input[name="' + key + '"]');
								if (mapFieldElement.length > 0) {
									mapFieldElement.val(response[value[0]]);
								}
								var mapFieldDisplayElement = formElement.find('input[name="' + key + '_display"]');
								if (mapFieldDisplayElement.length > 0) {
									mapFieldDisplayElement.val(response[value[0] + '_label']).attr('readonly', true);
									var referenceModulesList = formElement.find('#' + app.getModuleName() + '_editView_fieldName_' + key + '_dropDown');
									if (referenceModulesList.length > 0) {
										referenceModulesList.val(value[1]).trigger("chosen:updated");
									}
								}
							}
						});
					}
			);
		}
	},
	getRelationOperation: function () {
		if (this.relationOperation === '') {
			var relationOperation = jQuery('[name="relationOperation"]');
			if (relationOperation.length) {
				this.relationOperation = relationOperation.val();
			} else {
				this.relationOperation = false;
			}
		}
		return this.relationOperation;
	},
	getMappingValuesFromUrl: function (key) {
		var relationOperation = this.getRelationOperation();
		if (relationOperation) {
			return app.getUrlVar(key);
		}
		return false;
	},
	proceedRegisterEvents: function () {
		if (jQuery('.recordEditView').length > 0) {
			return true;
		} else {
			return false;
		}
	},
	treePopupRegisterEvent: function (container) {
		var thisInstance = this;
		container.on("click", '.treePopup', function (e) {
			thisInstance.openTreePopUp(e);
		});
	},
	/**
	 * Function which will register reference field clear event
	 * @params - container <jQuery> - element in which auto complete fields needs to be searched
	 */
	registerClearTreeSelectionEvent: function (container) {
		container.find('.clearTreeSelection').on('click', function (e) {
			var element = jQuery(e.currentTarget);
			var parentTdElement = element.closest('td');
			var fieldNameElement = parentTdElement.find('.sourceField');
			var fieldName = fieldNameElement.attr('name');
			fieldNameElement.val('');
			parentTdElement.find('#' + fieldName + '_display').removeAttr('readonly').val('');
			e.preventDefault();
		})
	},
	openTreePopUp: function (e) {
		var thisInstance = this;
		var parentElem = jQuery(e.target).closest('td');
		var form = jQuery(e.target).closest('form');
		var params = {};
		var moduleName = jQuery('input[name="module"]', form).val();
		var sourceFieldElement = jQuery('input[class="sourceField"]', parentElem);
		var sourceFieldDisplay = sourceFieldElement.attr('name') + "_display";
		var fieldDisplayElement = jQuery('input[name="' + sourceFieldDisplay + '"]', parentElem);
		var sourceRecordElement = jQuery('input[name="record"]');
		var sourceRecordId = '';
		if (sourceRecordElement.length > 0) {
			sourceRecordId = sourceRecordElement.val();
		}
		urlOrParams = 'module=' + moduleName + '&view=TreePopup&template=' + sourceFieldElement.data('treetemplate') + '&src_field=' + sourceFieldElement.attr('name') + '&src_record=' + sourceRecordId;
		var popupInstance = Vtiger_Popup_Js.getInstance();
		popupInstance.show(urlOrParams, function (data) {
			var responseData = JSON.parse(data);
			sourceFieldElement.val('T' + responseData.id);
			fieldDisplayElement.val(responseData.name).attr('readonly', true);
		});
	},
	/**
	 * Function which will handle the reference auto complete event registrations
	 * @params - container <jQuery> - element in which auto complete fields needs to be searched
	 */
	registerTreeAutoCompleteFields: function (container) {
		var thisInstance = this;
		container.find('input.treeAutoComplete').autocomplete({
			'delay': '600',
			'minLength': '3',
			'source': function (request, response) {
				//element will be array of dom elements
				//here this refers to auto complete instance
				var inputElement = jQuery(this.element[0]);
				var searchValue = request.term;
				var parentElem = inputElement.closest('td');
				var sourceFieldElement = jQuery('input[class="sourceField"]', parentElem);
				var allValues = sourceFieldElement.data('allvalues');
				var reponseDataList = new Array();
				for (var id in allValues) {
					var name = allValues[id][0];
					if (name.toLowerCase().indexOf(searchValue) >= 0) {
						var parent = allValues[id][1];
						var label = '';
						if (parent != '')
							var label = '(' + allValues[parent][0] + ') ';
						label = label + name;
						reponseDataList.push({"label": label, "value": name, "id": id});
					}
				}
				if (reponseDataList.length <= 0) {
					jQuery(inputElement).val('');
					reponseDataList.push({
						'label': app.vtranslate('JS_NO_RESULTS_FOUND'),
						'type': 'no results'
					});
				}
				response(reponseDataList);
			},
			'select': function (event, ui) {
				var selectedItemData = ui.item;
				//To stop selection if no results is selected
				if (typeof selectedItemData.type != 'undefined' && selectedItemData.type == "no results") {
					return false;
				}
				selectedItemData.name = selectedItemData.value;
				var element = jQuery(this);
				var tdElement = element.closest('td');
				var sourceField = tdElement.find('input[class="sourceField"]');
				var sourceFieldDisplay = sourceField.attr('name') + "_display";
				var fieldDisplayElement = jQuery('input[name="' + sourceFieldDisplay + '"]', tdElement);

				sourceField.val(selectedItemData.id);
				fieldDisplayElement.val(selectedItemData.label).attr('readonly', true);
			},
			'change': function (event, ui) {
				var element = jQuery(this);
			},
			'open': function (event, ui) {
				//To Make the menu come up in the case of quick create
				jQuery(this).data('autocomplete').menu.element.css('z-index', '100001');

			}
		});
	},
	referenceModulePopupRegisterEvent: function (container) {
		var thisInstance = this;
		container.on("click", '.relatedPopup', function (e) {
			thisInstance.openPopUp(e);
		});
		container.find('.referenceModulesList').chosen().change(function (e) {
			var element = jQuery(e.currentTarget);
			var closestTD = element.closest('td').next();
			var popupReferenceModule = element.val();
			var referenceModuleElement = jQuery('input[name="popupReferenceModule"]', closestTD);
			var prevSelectedReferenceModule = referenceModuleElement.val();
			referenceModuleElement.val(popupReferenceModule);

			//If Reference module is changed then we should clear the previous value
			if (prevSelectedReferenceModule != popupReferenceModule) {
				closestTD.find('.clearReferenceSelection').trigger('click');
			}
		});
	},
	getReferencedModuleName: function (parenElement) {
		return jQuery('input[name="popupReferenceModule"]', parenElement).val();
	},
	searchModuleNames: function (params) {
		var aDeferred = jQuery.Deferred();

		if (typeof params.module == 'undefined') {
			params.module = app.getModuleName();
		}

		if (typeof params.action == 'undefined') {
			params.action = 'BasicAjax';
		}

		if (params.search_module == 'Products' || params.search_module == 'Services') {
			params.potentialid = jQuery('[name="potentialid"]').val();
		}

		AppConnector.request(params).then(
				function (data) {
					aDeferred.resolve(data);
				},
				function (error) {
					//TODO : Handle error
					aDeferred.reject();
				}
		)
		return aDeferred.promise();
	},
	/**
	 * Function to get reference search params
	 */
	getReferenceSearchParams: function (element) {
		var tdElement = jQuery(element).closest('td');
		var params = {};
		var searchModule = this.getReferencedModuleName(tdElement);
		params.search_module = searchModule;
		return params;
	},
	/**
	 * Function which will handle the reference auto complete event registrations
	 * @params - container <jQuery> - element in which auto complete fields needs to be searched
	 */
	registerAutoCompleteFields: function (container) {
		var thisInstance = this;
		container.find('input.autoComplete').autocomplete({
			delay: '600',
			minLength: '3',
			source: function (request, response) {
				//element will be array of dom elements
				//here this refers to auto complete instance
				var inputElement = jQuery(this.element[0]);
				var searchValue = request.term;
				var params = thisInstance.getReferenceSearchParams(inputElement);
				params.search_value = searchValue;
				//params.parent_id = app.getRecordId();
				//params.parent_module = app.getModuleName();
				thisInstance.searchModuleNames(params).then(function (data) {
					var reponseDataList = new Array();
					var serverDataFormat = data.result
					if (serverDataFormat.length <= 0) {
						jQuery(inputElement).val('');
						serverDataFormat = new Array({
							'label': app.vtranslate('JS_NO_RESULTS_FOUND'),
							'type': 'no results'
						});
					}
					for (var id in serverDataFormat) {
						var responseData = serverDataFormat[id];
						reponseDataList.push(responseData);
					}
					response(reponseDataList);
				});
			},
			select: function (event, ui) {
				var selectedItemData = ui.item;
				//To stop selection if no results is selected
				if (typeof selectedItemData.type != 'undefined' && selectedItemData.type == "no results") {
					return false;
				}
				selectedItemData.name = selectedItemData.value;
				var element = jQuery(this);
				var tdElement = element.closest('td');
				thisInstance.setReferenceFieldValue(tdElement, selectedItemData);

				var sourceField = tdElement.find('input[class="sourceField"]').attr('name');
				var fieldElement = tdElement.find('input[name="' + sourceField + '"]');

				fieldElement.trigger(Vtiger_Edit_Js.postReferenceSelectionEvent, {'data': selectedItemData});
			},
			change: function (event, ui) {
				var element = jQuery(this);
				//if you dont have readonly attribute means the user didnt select the item
				if (element.attr('readonly') == undefined) {
					element.closest('td').find('.clearReferenceSelection').trigger('click');
				}
			},
			open: function (event, ui) {
				//To Make the menu come up in the case of quick create
				jQuery(this).data('ui-autocomplete').menu.element.css('z-index', '100001');
			}
		});
	},
	/**
	 * Function which will register reference field clear event
	 * @params - container <jQuery> - element in which auto complete fields needs to be searched
	 */
	registerClearReferenceSelectionEvent: function (container) {
		container.find('.clearReferenceSelection').on('click', function (e) {
			var element = jQuery(e.currentTarget);
			var parentTdElement = element.closest('td');
			var fieldNameElement = parentTdElement.find('.sourceField');
			var fieldName = fieldNameElement.attr('name');
			fieldNameElement.val('');
			parentTdElement.find('[name="' + fieldName + '_display"]').removeAttr('readonly').val('');
			element.trigger(Vtiger_Edit_Js.referenceDeSelectionEvent);
			e.preventDefault();
		})
	},
	/**
	 * Function which will register event to prevent form submission on pressing on enter
	 * @params - container <jQuery> - element in which auto complete fields needs to be searched
	 */
	registerPreventingEnterSubmitEvent: function (container) {
		container.on('keypress', function (e) {
			//Stop the submit when enter is pressed in the form
			var currentElement = jQuery(e.target);
			if (e.which == 13 && (!currentElement.is('textarea'))) {
				e.preventDefault();
			}
		})
	},
	/**
	 * Function which will give you all details of the selected record
	 * @params - an Array of values like {'record' : recordId, 'source_module' : searchModule, 'selectedName' : selectedRecordName}
	 */
	getRecordDetails: function (params) {
		var aDeferred = jQuery.Deferred();
		var url = "index.php?module=" + app.getModuleName() + "&action=GetData&record=" + params['record'] + "&source_module=" + params['source_module'];
		AppConnector.request(url).then(
				function (data) {
					if (data['success']) {
						aDeferred.resolve(data);
					} else {
						aDeferred.reject(data['message']);
					}
				},
				function (error) {
					aDeferred.reject();
				}
		)
		return aDeferred.promise();
	},
	registerTimeFields: function (container) {
		app.registerEventForTimeFields(container);
	},
	referenceCreateHandler: function (container) {
		var thisInstance = this;
		var postQuickCreateSave = function (data) {
			var params = {};
			params.name = data.result._recordLabel;
			params.id = data.result._recordId;
			thisInstance.setReferenceFieldValue(container, params);
		}

		var referenceModuleName = this.getReferencedModuleName(container);
		Vtiger_Header_Js.getInstance().quickCreateModule(referenceModuleName, {callbackFunction: postQuickCreateSave});
	},
	/**
	 * Function which will register event for create of reference record
	 * This will allow users to create reference record from edit view of other record
	 */
	registerReferenceCreate: function (container) {
		var thisInstance = this;
		container.on('click', '.createReferenceRecord', function (e) {
			var element = jQuery(e.currentTarget);
			var controlElementTd = element.closest('td');

			thisInstance.referenceCreateHandler(controlElementTd);
		})
	},
	addressFieldsMapping: [
		'buildingnumber',
		'localnumber',
		'addresslevel1',
		'addresslevel2',
		'addresslevel3',
		'addresslevel4',
		'addresslevel5',
		'addresslevel6',
		'addresslevel7',
		'addresslevel8',
		'pobox'
	],
	addressFieldsMappingBlockID: {
		'LBL_ADDRESS_INFORMATION': 'a',
		'LBL_ADDRESS_MAILING_INFORMATION': 'b',
		'LBL_ADDRESS_DELIVERY_INFORMATION': 'c'
	},
	addressFieldsData: false,
	/**
	 * Function to register event for copying addresses
	 */
	registerEventForCopyAddress: function () {
		var thisInstance = this;
		var formElement = this.getForm();
		var account_id = false;
		var contact_id = false;
		var lead_id = false;
		var vendor_id = false;
		jQuery("#EditView table td").each(function (index) {
			var referenceModulesList = false;
			var relatedField = $(this).find('[name="popupReferenceModule"]').val();
			if (relatedField == 'Accounts') {
				account_id = $(this).find('.sourceField').attr("name");
			}
			if (relatedField == 'Contacts') {
				contact_id = $(this).find('.sourceField').attr("name");
			}
			if (relatedField == 'Leads') {
				lead_id = $(this).find('.sourceField').attr("name");
			}
			if (relatedField == 'Vendors') {
				vendor_id = $(this).find('.sourceField').attr("name");
			}
			referenceModulesList = $(this).find('.referenceModulesList');
			if (referenceModulesList.length > 0) {
				$.each(referenceModulesList.find('option'), function (key, data) {
					if (data.value == 'Accounts') {
						account_id = jQuery("#EditView table td").eq(index + 1).find('.sourceField').attr("name");
					}
					if (data.value == 'Contacts') {
						contact_id = jQuery("#EditView table td").eq(index + 1).find('.sourceField').attr("name");
					}
					if (data.value == 'Leads') {
						lead_id = jQuery("#EditView table td").eq(index + 1).find('.sourceField').attr("name");
					}
					if (data.value == 'Vendors') {
						vendor_id = jQuery("#EditView table td").eq(index + 1).find('.sourceField').attr("name");
					}
				});
			}
		});
		if (account_id == false) {
			jQuery(".copyAddressFromAccount").addClass('hide');
		} else {
			jQuery('.copyAddressFromAccount').on('click', function (e) {
				var element = jQuery(this);
				var block = element.closest('table');
				var from = element.data('label');
				var to = block.data('label');
				var recordRelativeAccountId = jQuery('[name="' + account_id + '"]').val();
				if (recordRelativeAccountId == "" || recordRelativeAccountId == "0") {
					Vtiger_Helper_Js.showPnotify(app.vtranslate('JS_PLEASE_SELECT_AN_ACCOUNT_TO_COPY_ADDRESS'));
				} else {
					var recordRelativeAccountName = jQuery('#' + account_id + '_display').val();
					var data = {
						'record': recordRelativeAccountId,
						'selectedName': recordRelativeAccountName,
						'source_module': "Accounts"
					}
					thisInstance.copyAddressDetails(from, to, data, element.closest('table'));
					element.attr('checked', 'checked');
				}
			})
		}
		if (contact_id == false) {
			jQuery(".copyAddressFromContact").addClass('hide');
		} else {
			jQuery('.copyAddressFromContact').on('click', function (e) {
				var element = jQuery(this);
				var block = element.closest('table');
				var from = element.data('label');
				var to = block.data('label');
				var recordRelativeAccountId = jQuery('[name="' + contact_id + '"]').val();
				if (recordRelativeAccountId == "" || recordRelativeAccountId == "0") {
					Vtiger_Helper_Js.showPnotify(app.vtranslate('JS_PLEASE_SELECT_AN_CONTACT_TO_COPY_ADDRESS'));
				} else {
					var recordRelativeAccountName = jQuery('#' + contact_id + '_display').val();
					var data = {
						'record': recordRelativeAccountId,
						'selectedName': recordRelativeAccountName,
						'source_module': "Contacts"
					}
					thisInstance.copyAddressDetails(from, to, data, element.closest('table'));
					element.attr('checked', 'checked');
				}
			})
		}
		if (lead_id == false) {
			jQuery(".copyAddressFromLead").addClass('hide');
		} else {
			jQuery('.copyAddressFromLead').on('click', function (e) {
				var element = jQuery(this);
				var block = element.closest('table');
				var from = element.data('label');
				var to = block.data('label');
				var recordRelativeAccountId = jQuery('[name="' + lead_id + '"]').val();
				if (recordRelativeAccountId == "" || recordRelativeAccountId == "0") {
					Vtiger_Helper_Js.showPnotify(app.vtranslate('JS_PLEASE_SELECT_AN_LEAD_TO_COPY_ADDRESS'));
				} else {
					var recordRelativeAccountName = jQuery('#' + lead_id + '_display').val();
					var data = {
						'record': recordRelativeAccountId,
						'selectedName': recordRelativeAccountName,
						'source_module': "Leads"
					}
					thisInstance.copyAddressDetails(from, to, data, element.closest('table'));
					element.attr('checked', 'checked');
				}
			})
		}
		if (vendor_id == false) {
			jQuery(".copyAddressFromVendor").addClass('hide');
		} else {
			jQuery('.copyAddressFromVendor').on('click', function (e) {
				var element = jQuery(this);
				var block = element.closest('table');
				var from = element.data('label');
				var to = block.data('label');
				var recordRelativeAccountId = jQuery('[name="' + vendor_id + '"]').val();
				if (recordRelativeAccountId == "" || recordRelativeAccountId == "0") {
					Vtiger_Helper_Js.showPnotify(app.vtranslate('JS_PLEASE_SELECT_AN_VENDOR_TO_COPY_ADDRESS'));
				} else {
					var recordRelativeAccountName = jQuery('#' + vendor_id + '_display').val();
					var data = {
						'record': recordRelativeAccountId,
						'selectedName': recordRelativeAccountName,
						'source_module': "Vendors"
					}
					thisInstance.copyAddressDetails(from, to, data, element.closest('table'));
					element.attr('checked', 'checked');
				}
			})
		}
		if (contact_id == false && account_id == false && lead_id == false && vendor_id == false) {
			jQuery(".copyAddressLabel").addClass('hide');
		}
		jQuery('.copyAddressFromMain').on('click', function (e) {
			var element = jQuery(this);
			var block = element.closest('table');
			var from = element.data('label');
			var to = block.data('label');
			thisInstance.copyAddress(from, to, false, false);
		})
		jQuery('.copyAddressFromMailing').on('click', function (e) {
			var element = jQuery(this);
			var block = element.closest('table');
			var from = element.data('label');
			var to = block.data('label');
			thisInstance.copyAddress(from, to, false, false);
		})
		jQuery('.copyAddressFromDelivery').on('click', function (e) {
			var element = jQuery(this);
			var block = element.closest('table');
			var from = element.data('label');
			var to = block.data('label');
			thisInstance.copyAddress(from, to, false, false);
		})
	},
	/**
	 * Function which will copy the address details
	 */
	copyAddressDetails: function (from, to, data, container) {
		var thisInstance = this;
		var sourceModule = data['source_module'];
		var noAddress = true;
		var errorMsg;
		thisInstance.getRecordDetails(data).then(
				function (data) {
					var response = data['result'];
					thisInstance.addressFieldsData = response['data'];
					thisInstance.copyAddress(from, to, true, sourceModule);
				},
				function (error, err) {

				}
		);
	},
	/**
	 * Function to copy address between fields
	 * @param strings which accepts value as either odd or even
	 */
	copyAddress: function (fromLabel, toLabel, reletedRecord, sourceModule) {
		var status = false;
		var thisInstance = this;
		var formElement = this.getForm();
		var addressMapping = this.addressFieldsMapping;
		var BlockIds = this.addressFieldsMappingBlockID;

		from = BlockIds[fromLabel];
		if (app.getModuleName() == 'Quotes' || app.getModuleName() == 'Invoice') {
			BlockIds = {
				'LBL_ADDRESS_INFORMATION': 'a',
				'LBL_ADDRESS_DELIVERY_INFORMATION': 'b'
			};
		}
		if (reletedRecord === false || sourceModule === false)
			from = BlockIds[fromLabel];
		to = BlockIds[toLabel];
		for (var key in addressMapping) {
			var nameElementFrom = addressMapping[key] + from;
			var nameElementTo = addressMapping[key] + to;
			if (reletedRecord) {
				var fromElement = thisInstance.addressFieldsData[nameElementFrom];
				var fromElementLable = thisInstance.addressFieldsData[nameElementFrom + '_label'];
			} else {
				var fromElement = formElement.find('[name="' + nameElementFrom + '"]').val();
				var fromElementLable = formElement.find('[name="' + nameElementFrom + '_display"]').val();
			}
			var toElement = formElement.find('[name="' + nameElementTo + '"]');
			var toElementLable = formElement.find('[name="' + nameElementTo + '_display"]');
			if (fromElement != '' && fromElement != '0' && fromElement != undefined) {
				if (toElementLable.length > 0)
					toElementLable.attr('readonly', true);
				status = true;
				toElement.val(fromElement);
				toElementLable.val(fromElementLable);
			} else {
				toElement.attr('readonly', false);
			}
		}
		if (status == false) {
			if (sourceModule == "Accounts") {
				errorMsg = 'JS_SELECTED_ACCOUNT_DOES_NOT_HAVE_AN_ADDRESS';
			} else if (sourceModule == "Contacts") {
				errorMsg = 'JS_SELECTED_CONTACT_DOES_NOT_HAVE_AN_ADDRESS';
			} else {
				errorMsg = 'JS_DOES_NOT_HAVE_AN_ADDRESS';
			}
			Vtiger_Helper_Js.showPnotify(app.vtranslate(errorMsg));
		}
	},
	registerReferenceSelectionEvent: function (container) {
		var thisInstance = this;
		var relategField = container.find("input[name*='addresslevel']");
		relategField.on(Vtiger_Edit_Js.referenceSelectionEvent, function (e, data) {
			var blockContainer = jQuery(e.currentTarget).closest('.blockContainer');
			thisInstance.copyAddressDetailsRef(data, blockContainer);
		});
	},
	copyAddressDetailsRef: function (data, container) {
		var thisInstance = this;
		thisInstance.getRecordDetails(data).then(
				function (data) {
					var response = data['result'];
					thisInstance.mapAddressDetails(response['data'], container);
				},
				function (error, err) {

				});
	},
	mapAddressDetails: function (result, container) {
		for (var key in result) {
			if (key.indexOf("addresslevel") != -1) {

				if (container.find('[name="' + key + '"]').length != 0) {
					container.find('[name="' + key + '"]').val(result[key]);
					container.find('[name="' + key + '"]').attr('readonly', true);
					container.find('[name="' + key + '_display"]').val(result[key + '_label']);
					container.find('[name="' + key + '_display"]').attr('readonly', true);
				}
				if (container.find('[name="' + key + 'a"]').length != 0 && container.find('[name="' + key + 'a"]').val() == 0 && result[key] != 0) {
					container.find('[name="' + key + 'a"]').val(result[key]);
					container.find('[name="' + key + 'a"]').attr('readonly', true);
					container.find('[name="' + key + 'a_display"]').val(result[key + '_label']);
					container.find('[name="' + key + 'a_display"]').attr('readonly', true);
				}
				if (container.find('[name="' + key + 'b"]').length != 0 && container.find('[name="' + key + 'b"]').val() == 0 && result[key] != 0) {
					container.find('[name="' + key + 'b"]').val(result[key]);
					container.find('[name="' + key + 'b"]').attr('readonly', true);
					container.find('[name="' + key + 'b_display"]').val(result[key + '_label']);
					container.find('[name="' + key + 'b_display"]').attr('readonly', true);
				}
				if (container.find('[name="' + key + 'c"]').length != 0 && container.find('[name="' + key + 'c"]').val() == 0 && result[key] != 0) {
					container.find('[name="' + key + 'c"]').val(result[key]);
					container.find('[name="' + key + 'c"]').attr('readonly', true);
					container.find('[name="' + key + 'c_display"]').val(result[key + '_label']);
					container.find('[name="' + key + 'c_display"]').attr('readonly', true);
				}
			}
		}
	},
	registerMaskFields: function (container) {
		var thisInstance = this;
		container.find(":input").inputmask();
	},
	/**
	 * Function which will register basic events which will be used in quick create as well
	 *
	 */
	registerBasicEvents: function (container) {
		this.treePopupRegisterEvent(container);
		this.registerClearTreeSelectionEvent(container);
		this.registerTreeAutoCompleteFields(container);
		this.referenceModulePopupRegisterEvent(container);
		this.registerAutoCompleteFields(container);
		this.registerClearReferenceSelectionEvent(container);
		this.registerPreventingEnterSubmitEvent(container);
		this.registerTimeFields(container);
		this.registerRecordAccessCheckEvent(container);
		this.registerEventForPicklistDependencySetup(container);
		this.registerRecordPreSaveEventEvent(container);
		this.registerReferenceSelectionEvent(container);
		this.registerMaskFields(container);
	},
	/**
	 * Function to register event for image delete
	 */
	registerEventForImageDelete: function () {
		var formElement = this.getForm();
		var recordId = formElement.find('input[name="record"]').val();
		formElement.find('.imageDelete').on('click', function (e) {
			var element = jQuery(e.currentTarget);
			var parentTd = element.closest('td');
			var imageUploadElement = parentTd.find('[name="imagename[]"]');
			var fieldInfo = imageUploadElement.data('fieldinfo');
			var mandatoryStatus = fieldInfo.mandatory;
			var imageId = element.closest('div').find('img').data().imageId;
			element.closest('div').remove();
			var exisitingImages = parentTd.find('[name="existingImages"]');
			if (exisitingImages.length < 1 && mandatoryStatus) {
				formElement.validationEngine('detach');
				imageUploadElement.attr('data-validation-engine', 'validate[required,funcCall[Vtiger_Base_Validator_Js.invokeValidation]]');
				formElement.validationEngine('attach');
			}

			if (formElement.find('[name=imageid]').length != 0) {
				var imageIdValue = JSON.parse(formElement.find('[name=imageid]').val());
				imageIdValue.push(imageId);
				formElement.find('[name=imageid]').val(JSON.stringify(imageIdValue));
			} else {
				var imageIdJson = [];
				imageIdJson.push(imageId);
				formElement.append('<input type="hidden" name="imgDeleted" value="true" />');
				formElement.append('<input type="hidden" name="imageid" value="' + JSON.stringify(imageIdJson) + '" />');
			}
		});
	},
	triggerDisplayTypeEvent: function () {
		var widthType = app.cacheGet('widthType', 'narrowWidthType');
		if (widthType) {
			var elements = jQuery('#EditView').find('td');
			elements.addClass(widthType);
		}
	},
	registerSubmitEvent: function () {
		var editViewForm = this.getForm();
		editViewForm.submit(function (e) {
			//Form should submit only once for multiple clicks also
			if (typeof editViewForm.data('submit') != "undefined") {
				return false;
			} else {
				document.progressLoader = jQuery.progressIndicator({
					'message': app.vtranslate('JS_SAVE_LOADER_INFO'),
					'position': 'html',
					'blockInfo': {
						'enabled': true
					}
				});

				var module = jQuery(e.currentTarget).find('[name="module"]').val();
				if (editViewForm.validationEngine('validate')) {
					//Once the form is submiting add data attribute to that form element
					editViewForm.data('submit', 'true');
					//on submit form trigger the recordPreSave event
					var recordPreSaveEvent = jQuery.Event(Vtiger_Edit_Js.recordPreSave);
					editViewForm.trigger(recordPreSaveEvent, {'value': 'edit'});
					if (recordPreSaveEvent.isDefaultPrevented()) {
						//If duplicate record validation fails, form should submit again
						document.progressLoader.progressIndicator({'mode': 'hide'});
						editViewForm.removeData('submit');
						e.preventDefault();
					}
				} else {
					//If validation fails, form should submit again
					document.progressLoader.progressIndicator({'mode': 'hide'});
					editViewForm.removeData('submit');
					// to avoid hiding of error message under the fixed nav bar
					app.formAlignmentAfterValidation(editViewForm);
				}
			}
		});
	},
	/*
	 * Function to check the view permission of a record after save
	 */
	registerRecordPreSaveEventEvent: function (form) {
		if (Vtiger_Edit_Js.SaveResultInstance == false) {
			Vtiger_Edit_Js.SaveResultInstance = new SaveResult();
		}
		var formElement = this.getForm();
		var formData = formElement.serializeFormData();
		if (Vtiger_Edit_Js.SaveResultInstance.recordValue == false) {
			Vtiger_Edit_Js.SaveResultInstance.loadFormData(formData);
		}
		form.on(Vtiger_Edit_Js.recordPreSave, function (e, data) {
			if (Vtiger_Edit_Js.SaveResultInstance.checkData(form.serializeFormData(), form) == false) {
				e.preventDefault();
			}
		});
	},
	registerRecordAccessCheckEvent: function (form) {

		form.on(Vtiger_Edit_Js.recordPreSave, function (e, data) {
			var assignedToSelectElement = jQuery('[name="assigned_user_id"]', form);
			if (assignedToSelectElement.data('recordaccessconfirmation') == true) {
				return;
			} else {
				if (assignedToSelectElement.data('recordaccessconfirmationprogress') != true) {
					var recordAccess = assignedToSelectElement.find('option:selected').data('recordaccess');
					if (recordAccess == false) {
						var message = app.vtranslate('JS_NO_VIEW_PERMISSION_AFTER_SAVE');
						Vtiger_Helper_Js.showConfirmationBox({'message': message}).then(
								function (e) {
									assignedToSelectElement.data('recordaccessconfirmation', true);
									assignedToSelectElement.removeData('recordaccessconfirmationprogress');
									form.append('<input type="hidden" name="returnToList" value="true" />');
									form.submit();
								},
								function (error, err) {
									assignedToSelectElement.removeData('recordaccessconfirmationprogress');
									e.preventDefault();
								});
						assignedToSelectElement.data('recordaccessconfirmationprogress', true);
					} else {
						return true;
					}
				}
			}
			e.preventDefault();
		});
	},
	/**
	 * Function to register event for setting up picklistdependency
	 * for a module if exist on change of picklist value
	 */
	registerEventForPicklistDependencySetup: function (container) {
		var picklistDependcyElemnt = jQuery('[name="picklistDependency"]', container);
		if (picklistDependcyElemnt.length <= 0) {
			return;
		}
		var picklistDependencyMapping = JSON.parse(picklistDependcyElemnt.val());

		var sourcePicklists = Object.keys(picklistDependencyMapping);
		if (sourcePicklists.length <= 0) {
			return;
		}

		var sourcePickListNames = [];
		for (var i = 0; i < sourcePicklists.length; i++) {
			sourcePickListNames.push('[name="' + sourcePicklists[i] + '"]');
		}
		sourcePickListNames = sourcePickListNames.join(',');
		var sourcePickListElements = container.find(sourcePickListNames);

		sourcePickListElements.on('change', function (e) {
			var currentElement = jQuery(e.currentTarget);
			var sourcePicklistname = currentElement.attr('name');

			var configuredDependencyObject = picklistDependencyMapping[sourcePicklistname];
			var selectedValue = currentElement.val();
			var targetObjectForSelectedSourceValue = configuredDependencyObject[selectedValue];
			var picklistmap = configuredDependencyObject["__DEFAULT__"];

			if (typeof targetObjectForSelectedSourceValue == 'undefined') {
				targetObjectForSelectedSourceValue = picklistmap;
			}
			jQuery.each(picklistmap, function (targetPickListName, targetPickListValues) {
				var targetPickListMap = targetObjectForSelectedSourceValue[targetPickListName];
				if (typeof targetPickListMap == "undefined") {
					targetPickListMap = targetPickListValues;
				}
				var targetPickList = jQuery('[name="' + targetPickListName + '"]', container);
				if (targetPickList.length <= 0) {
					return;
				}

				var listOfAvailableOptions = targetPickList.data('availableOptions');
				if (typeof listOfAvailableOptions == "undefined") {
					listOfAvailableOptions = jQuery('option', targetPickList);
					targetPickList.data('available-options', listOfAvailableOptions);
				}

				var targetOptions = new jQuery();
				var optionSelector = [];
				optionSelector.push('');
				for (var i = 0; i < targetPickListMap.length; i++) {
					optionSelector.push(targetPickListMap[i]);
				}

				jQuery.each(listOfAvailableOptions, function (i, e) {
					var picklistValue = jQuery(e).val();
					if (jQuery.inArray(picklistValue, optionSelector) != -1) {
						targetOptions = targetOptions.add(jQuery(e));
					}
				})
				var targetPickListSelectedValue = '';
				var targetPickListSelectedValue = targetOptions.filter('[selected]').val();
				targetPickList.html(targetOptions).val(targetPickListSelectedValue).trigger("chosen:updated");
			})
		});

		//To Trigger the change on load
		sourcePickListElements.trigger('change');
	},
	registerLeavePageWithoutSubmit: function (form) {
		InitialFormData = form.serialize();
		window.onbeforeunload = function (e) {
			if (InitialFormData != form.serialize() && form.data('submit') != "true") {
				return app.vtranslate("JS_CHANGES_WILL_BE_LOST");
			}
		};
	},
	stretchCKEditor: function () {
		var row = jQuery('.ckEditorSource').parents('tr');
		var td = jQuery('.ckEditorSource').parent();
		jQuery(row).find('.fieldLabel').remove();
		jQuery(td).removeClass('col-md-10');
		jQuery(td).addClass('col-md-12');
	},
	/**
	 * Function to register event for ckeditor for description field
	 */
	registerEventForCkEditor: function () {
		var form = this.getForm();
		var thisInstance = this;
		$.each(form.find('.ckEditorSource'), function (key, data) {
			thisInstance.loadCkEditorElement(jQuery(data));
		});
	},
	loadCkEditorElement: function (noteContentElement) {
		var customConfig = {};
		if (noteContentElement.is(':visible')) {
			noteContentElement.removeAttr('data-validation-engine');
			if (noteContentElement.hasClass("ckEditorBasic")) {
				customConfig.toolbar = 'Basic';
			}
			if (noteContentElement.hasClass("ckEditorSmall")) {
				customConfig.height = '5em';
			}
			var ckEditorInstance = new Vtiger_CkEditor_Js();
			ckEditorInstance.loadCkEditor(noteContentElement, customConfig);
		}
	},
	registerHelpInfo: function () {
		var form = this.getForm();
		app.showPopoverElementView(form.find('.HelpInfoPopover'));
	},
	registerBlockAnimationEvent: function () {
		var detailContentsHolder = this.getForm();
		detailContentsHolder.on('click', '.blockHeader', function (e) {
			if (jQuery(e.target).is('input') || jQuery(e.target).is('button') || jQuery(e.target).parents().is('button')) {
				return false;
			}
			var currentTarget = jQuery(e.currentTarget).find('.blockToggle').not('.hide');
			var blockId = currentTarget.data('id');
			var closestBlock = currentTarget.closest('.blockContainer');
			var bodyContents = closestBlock.find('tbody');
			var data = currentTarget.data();
			var module = app.getModuleName();
			var hideHandler = function () {
				bodyContents.addClass('hide');
				app.cacheSet(module + '.' + blockId, 0)
			}
			var showHandler = function () {
				bodyContents.removeClass('hide');
				app.cacheSet(module + '.' + blockId, 1)
			}
			if (data.mode == 'show') {
				hideHandler();
				currentTarget.addClass('hide');
				closestBlock.find('[data-mode="hide"]').removeClass('hide');
			} else {
				showHandler();
				currentTarget.addClass('hide');
				closestBlock.find("[data-mode='show']").removeClass('hide');
			}
		});

	},
	registerBlockStatusCheckOnLoad: function () {
		var blocks = this.getForm().find('.blockContainer');
		var module = app.getModuleName();
		blocks.each(function (index, block) {
			var currentBlock = jQuery(block);
			var headerAnimationElement = currentBlock.find('.blockToggle').not('.hide');
			var bodyContents = currentBlock.find('tbody')
			var blockId = headerAnimationElement.data('id');
			var cacheKey = module + '.' + blockId;
			var value = app.cacheGet(cacheKey, null);
			if (value != null) {
				if (value == 1) {
					headerAnimationElement.addClass('hide');
					currentBlock.find("[data-mode='show']").removeClass('hide');
					bodyContents.removeClass('hide');
				} else {
					headerAnimationElement.addClass('hide');
					currentBlock.find("[data-mode='hide']").removeClass('hide');
					bodyContents.addClass('hide');
				}
			}
		});
	},
	getDataFromOG: function (request, apiData) {
		var thisInstance = this;

		if (apiData["opencage_data"]) {
			return  jQuery.ajax({
				url: apiData["opencage_data"].geoCodeURL,
				data: {
					format: "json",
					q: request.term,
					pretty: '1',
					key: apiData["opencage_data"].geoCodeKey
				},
				success: function (data, textStatus, jqXHR) {
					if (data.results.length) {
						thisInstance.addressDataOG = jQuery.map(data.results, function (item) {
							return {
								label: item.formatted,
								source: 'opencage_geocoder',
								source_label: 'OpenCage Geocoder',
								value: item.components.road,
								components: item.components
							}
						});
					}
				}
			})
		}

		return [];
	},
	getDataFromGM: function (request, apiData) {
		var thisInstance = this;

		if (apiData["google_map_api"]) {
			return jQuery.ajax({
				url: apiData["google_map_api"].geoCodeURL,
				data: {
					address: request.term,
					key: apiData["google_map_api"].geoCodeKey
				},
				success: function (addressData) {

					if (0 < addressData.results.length) {
						var result = addressData.results[0].geometry.location;

						jQuery.ajax({
							url: apiData["google_map_api"].geoCodeURL,
							data: {
								latlng: result.lat + "," + result.lng,
								key: apiData["google_map_api"].geoCodeKey
							},
							success: function (data, textStatus, jqXHR) {
								thisInstance.addressDataGM = jQuery.map(data.results, function (item) {
									return {
										label: item.formatted_address,
										source: 'google_geocoding',
										source_label: 'Google Geocoding',
										value: item.formatted_address,
										components: thisInstance.mappingAddressDataFromGoogle(item.address_components)
									}
								})
							}
						})
					}
				}
			})
		}

		return [];
	},
	mappingAddressDataFromGoogle: function (address) {

		var data = {}

		for (var key in address) {
			var types = address[key]['types'];

			if ('route' === types[0]) {
				data.road = address[key]['long_name'];
			}

			if ('street_number' === types[0]) {
				var numbers = address[key]['long_name'];
				if (numbers.indexOf('/' > -1)) {
					var tab = numbers.split('/');

					data.house_number = tab[0];
					data.local_number = tab[1];

				} else {
					data.house_number = address[key]['long_name'];
				}
			}

			if ('country' === types[0] && 'political' === types[1]) {
				data.country = address[key]['long_name'];
			}

			if ('administrative_area_level_1' === types[0] && 'political' === types[1]) {
				data.state = address[key]['long_name'];
			}

			if ('administrative_area_level_2' === types[0] && 'political' === types[1]) {
				data.powiat = address[key]['long_name'];
			}

			if ('sublocality_level_1' === types[0] && 'sublocality' === types[1] && 'political' === types[2]) {
				data.region_city = address[key]['long_name'];
			}

			if ('postal_code' === types[0]) {
				data.postcode = address[key]['long_name'];
			}

			if ('locality' === types[0] && 'political' === types[1]) {
				data.city = address[key]['long_name'];
			}

		}

		return data;
	},
	registerApiAddress: function () {
		var thisInstance = this;
		var apiElement = jQuery('[name="apiAddress"]');
		var apiData = [];

		jQuery(apiElement).each(function (index, item) {
			var apiName = jQuery(item).data('api-name');
			var info = {
				geoCodeURL: jQuery(item).data('url'),
				geoCodeKey: jQuery(item).val()
			}

			apiData[apiName] = info;
			apiData["minLookupLenght"] = jQuery(item).data('lenght');
			apiData["max_num"] = jQuery(item).data('max-num');
		});

		if (!apiData) {
			return false;
		}

		jQuery('.api_address_autocomplete').each(function () {
			jQuery(this).autocomplete({
				source: function (request, response) {
					jQuery.when(
							thisInstance.getDataFromOG(request, apiData),
							thisInstance.getDataFromGM(request, apiData)

							).then(function (og, gm) {

						var result = thisInstance.addressDataOG.concat(thisInstance.addressDataGM);

						response(result.slice(0, apiData['max_num']));

					}).fail(function (e) {
						response([{label: app.vtranslate('An error has occurred. No results.'), value: ''}]);
					});
				},
				minLength: apiData.minLookupLenght,
				select: function (event, ui) {
					for (var key in ui.item.components) {
						var addressType = thisInstance.addressFieldsMappingFromApi[key];
						jQuery(this).parents('table').find('[name^="' + addressType + '"]').val(ui.item.components[key]);
					}
				}
			}).data("ui-autocomplete")._renderItem = function (ul, item) {
				return jQuery("<li>")
						.data("item.autocomplete", item)
						.append('<a><img style="width: 24px; height: 24px;" class="alignMiddle" src="layouts/vlayout/skins/images/'
								+ item.source + '.png" title="' + item.source_label + '" alt="' + item.source_label + '">' + item.label + "</a>")
						.appendTo(ul);
			};
		});
	},
	addressFieldsMappingFromApi: {
		'house_number': 'buildingnumber',
		'local_number': 'localnumber',
		'country': 'addresslevel1',
		'state': 'addresslevel2',
		'powiat': 'addresslevel3',
		'county': 'addresslevel4',
		'city': 'addresslevel5',
		'region_city': 'addresslevel6',
		'postcode': 'addresslevel7',
		'road': 'addresslevel8',
		'village': 'addresslevel5'
	},
	registerEvents: function () {
		var editViewForm = this.getForm();
		var statusToProceed = this.proceedRegisterEvents();
		if (!statusToProceed) {
			return;
		}
		this.registerHelpInfo();
		this.registerBlockAnimationEvent();
		this.registerBlockStatusCheckOnLoad();
		this.registerEventForCkEditor();
		this.stretchCKEditor();
		this.registerBasicEvents(this.getForm());
		this.registerEventForCopyAddress();
		this.registerEventForImageDelete();
		this.registerSubmitEvent();
		this.registerLeavePageWithoutSubmit(editViewForm);

		app.registerEventForDatePickerFields('#EditView');

		var params = app.validationEngineOptionsForRecord;
		params.onValidationComplete = function (element, valid) {
			if (valid) {
				var ckEditorSource = editViewForm.find('.ckEditorSource');
				if (ckEditorSource.length > 0) {
					var ckEditorSourceId = ckEditorSource.attr('id');
					var fieldInfo = ckEditorSource.data('fieldinfo');
					var isMandatory = fieldInfo.mandatory;
					var CKEditorInstance = CKEDITOR.instances[ckEditorSourceId];
					if (jQuery.type(CKEditorInstance) !== 'undefined' && jQuery.type(CKEditorInstance.document) === 'object') {
						var ckEditorValue = jQuery.trim(CKEditorInstance.document.getBody().getText());
						if (isMandatory && (ckEditorValue.length === 0)) {
							var ckEditorId = 'cke_' + ckEditorSourceId;
							var message = app.vtranslate('JS_REQUIRED_FIELD');
							jQuery('#' + ckEditorId).validationEngine('showPrompt', message, 'error', 'topLeft', true);
							return false;
						} else {
							return valid;
						}
					}
				}
				return valid;
			}
			return valid
		}
		editViewForm.validationEngine(params);

		this.registerReferenceCreate(editViewForm);
		this.registerApiAddress();
		//this.triggerDisplayTypeEvent();
	},
	getMappingRelatedField: function (sourceField, sourceFieldModule, container) {
		var mappingRelatedField = container.find('input[name="mappingRelatedField"]').val();
		var mappingRelatedModule = JSON.parse(mappingRelatedField);
		if (typeof mappingRelatedModule[sourceField] != 'undefined' && typeof mappingRelatedModule[sourceField][sourceFieldModule] != 'undefined')
			return mappingRelatedModule[sourceField][sourceFieldModule];
		return [];
	}
});

