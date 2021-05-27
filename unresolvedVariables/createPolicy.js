var CDM_CALLING_SERVICE = '30e03cd973532010af8a1fd9fdf6a727';
var INT_DATA_TYPE = 'aab367c1bf3320001875647fcf073909';
var SCRIPT = '(function(logger, currentRecord, documentRecord, callerInput, mappedInput, childrenOutputs, result) {\r\n\r\nsnapshotId=callerInput.snapshotId;\r\n\r\nvar cdmQ = new sn_cmdb_ci_class.CdmQuery().version(\"latest\").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();\r\n    \r\nwhile (node = cdmQ.next()) {\r\n    if(cdmQ.getValue(\"sys_class_name\") == \"sg_cdm_node_cdi\"){ \/\/only check for CDIs, nodes are not relevant\r\n        if (typeof cdmQ.getValue(\'value\') !== \'undefined\'){\r\n            if (cdmQ.getValue(\'value\').indexOf(\'@@\') !== -1) {\r\n                logger.info(\"unresolved variable detected for \" + cdmQ.getValue(\'name\') + \" | \"+ cdmQ.getValue(\'value\'));\r\n                sn_cdm.CdmPolicyUtil.addFailure(result, cdmQ, \"unresolved variable\", \"unresolved variable detected for \" + cdmQ.getValue(\'name\') + \" | \"+ cdmQ.getValue(\'value\'), snapshotId);\r\n            }\r\n        }\r\n    }\r\n  }\r\n\/\/check if at least 1 test has failed, if so, set decision to non_compliant\r\nresult.decision = result.failures.length ? Constants.NON_COMPLIANT : Constants.COMPLIANT;\r\nreturn result;\r\n\r\n} )(logger, currentRecord, documentRecord, callerInput, mappedInput, childrenOutputs, result);\r\n ';

var cdmCategoryId = _getOrCreateCategory('CDM', 'CDM Category')
gs.info('CDM Category = ' + cdmCategoryId);
var cdmPolicyId = _createPolicy(CDM_CALLING_SERVICE, cdmCategoryId, 'unresolvedVariables', 'checks that all variables are resolved in the snapshot');
gs.info('CDM Policy = ' + cdmPolicyId);
var draftVersionId = _getDraftVersion(cdmPolicyId, SCRIPT);
gs.info('Draft Version = ' + draftVersionId);

//set the input parameters
//_createInput(draftVersionId, 'keyName', INT_DATA_TYPE, 8080, false, true);


var policyVersion = new PolicyVersion(draftVersionId);
policyVersion.publishPolicy();
gs.info('Policy version published')
var policy = new Policy(cdmPolicyId);
policy.activate();
gs.info('Policy activated')

function _createInput(policyVersionId, name, type, defaultValue, mandatory, mapped) {
     var ioGr = new GlideRecord(Constants.IO_DEFINITION_TABLE);
     ioGr.setValue('io_context', policyVersionId);
     ioGr.setValue('table', Constants.POLICY_VERSION_TABLE);
     ioGr.setValue('name', name);
     ioGr.setValue('type', type);
     defaultValue && ioGr.setValue('default_value', defaultValue);
     ioGr.setValue('mandatory', !!mandatory);
     ioGr.setValue('used_as', Constants.IO_TYPE_INPUT);
     ioGr.setValue('used_for', mapped ? Constants.FOR_MAPPING : Constants.FOR_INVOCATION);
     ioGr.insert();
}

function _getDraftVersion(policyId, script) {
   var versionGr = new GlideRecord(Constants.POLICY_VERSION_TABLE);
   versionGr.addQuery('policy', policyId);
   versionGr.addQuery('state', Constants.POLICY_VERSION_STATE.DRAFT);
   versionGr.query();
   if (!versionGr.next()) {
      throw 'We should already have one draft version';
   }
   versionGr.setValue('script', script);
   versionGr.update();
   return versionGr.getUniqueValue();
}

function _createPolicy(callingServiceId, categoryId, name, description) {
   var policyGr = new GlideRecord(Constants.POLICY_TABLE);
   policyGr.setValue('calling_service', callingServiceId);
   policyGr.setValue('category', categoryId);
   policyGr.setValue('name', name);
   policyGr.setValue('description', description);
   return policyGr.insert();
}

function _getOrCreateCategory(name, description) {
   var catGr = new GlideRecord(Constants.CATEGORY_TABLE);
   catGr.addQuery('name', name);
   catGr.query();

   if (catGr.next()) {
      return catGr.getUniqueValue()
   }
   catGr.setValue('name', name);
   catGr.setValue('description', description);
   return catGr.insert();
}