var policyName = 'checkUniqueKeyValue_crossDeployables';
var policyDescription = 'validates for a given list of keyNames that the values are different accross different deployables';
var CDM_CALLING_SERVICE = '30e03cd973532010af8a1fd9fdf6a727';
var INT_DATA_TYPE = 'aab367c1bf3320001875647fcf073909';
var STRING_DATA_TYPE = '747127c1bf3320001875647fcf0739e0';
var SCRIPT = '\/**\r\n  @param logger: ExecutionLogger\r\n  @param currentRecord: GlideRecord(\'sn_pace_policy_version\')\r\n  @param documentRecord: GlideRecord(documentTable), where documentTable is runtime value provided as a part of invocation\r\n  @param callerInput: Object, passed as a invocation input\r\n  @param mappedInput: Object, retrieved from application for the current run\r\n  @param childrenOutputs: Array, stores outputs of children executions for the policy, where if present the first output is always a result of data collector, followed by outputs from other children policies\r\n  @param result: Object - { decision: \'compliant\/non_compliant\', results: [], errors: [], warnings: [] } is exposed, where output of the script is stored\r\n *\/\r\n (function(logger, currentRecord, documentRecord, callerInput, mappedInput, childrenOutputs, result) {\r\n  \r\n\/\/retrieve the input values\r\nvar snapshotId = callerInput.snapshotId;\r\nvar keyNameArr = mappedInput.keyName.split(\",\"); \/\/convert input to array of keyNames\r\n\r\n\/\/internal variables\r\nvar nbrFound = 0;\r\nvar node = \"0\";\r\n\r\n\/\/ start loop through the provided keyNames\r\nfor(var i = 0; i < keyNameArr.length; i++) {\r\n  \r\n  \/\/get the keyName to compare\r\n  keyName = keyNameArr[i].trim(); \/\/remove any whitespace characters\r\n  logger.info(\"=== keyName \"+i+\" :[\"+keyName+\"] ===\");\r\n\r\n  \/\/if an empty keyName was provided, throw a warning\r\n  if (keyName.length === 0) {\r\n      var cdmQ = new sn_cmdb_ci_class.CdmQuery().version(\"latest\").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();\r\n      while (node = cdmQ.next()) {\r\n        sn_cdm.CdmPolicyUtil.addWarning(result, cdmQ, \"empty keyName in input mapping\", \"check the mapping input settings - there is an empty keyName\", snapshotId);\r\n        logger.info(\"!!there is an empty keyName in the input mapping\");\r\n        break; \/\/record this warning to the first node in the snapshot\r\n      }\r\n  }\r\n\r\n  \/\/if no additional deployables have been passed on, throw a failure.\r\n  if (mappedInput.additionalDeployablesInput.length === 0) {\r\n      var cdmQ = new sn_cmdb_ci_class.CdmQuery().version(\"latest\").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();\r\n      while (node = cdmQ.next()) {\r\n        sn_cdm.CdmPolicyUtil.addFailure(result, cdmQ, \"no additional deployables selected\", \"check the mapping input settings - there must be at least 1 additional deployable to compare with\", snapshotId);\r\n        logger.info(\"!!there are no additional deployables set in the input mapping\");\r\n        result.decision = result.failures.length ? Constants.NON_COMPLIANT : Constants.COMPLIANT;\r\n        return result;\r\n      }\r\n  }\r\n\r\n  \/\/first get the value for the key in the primary deployable\r\n  var cdmQ = new sn_cmdb_ci_class.CdmQuery().version(\"latest\").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();\r\n  while (node = cdmQ.next()) {\r\n    if (cdmQ.getValue(\'name\') === keyName) {\r\n        primaryValue = sn_cmdb_ci_class.CdmUtil.getEffectiveValue(node);\r\n        logger.info(keyName + \" found with value \" + sn_cmdb_ci_class.CdmUtil.getEffectiveValue(node));\r\n        nbrFound++;\r\n    }\r\n  }\r\n\r\n  \/\/if keyName is not found in the snapshot then trigger a warning\r\n  \/\/reRun the cdmQ as an impacted node must be passed on to create the warning and there seems no other option to \"reset\" the while loop\r\n  \/\/this will record the warning on the first node of the snapshot\r\n  logger.info(keyName + \" was found \" +nbrFound + \" times\");\r\n  if (Number(nbrFound) === 0) {\r\n      var cdmQ = new sn_cmdb_ci_class.CdmQuery().version(\"latest\").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();\r\n      while (node = cdmQ.next()) {\r\n        sn_cdm.CdmPolicyUtil.addWarning(result, cdmQ, \"keyName [\"+keyName + \"] was not found\", \"provided keyName [\"+keyName + \"] in the mapping input was not found in the snapshot\", snapshotId);\r\n        logger.info(\"!! throwing warning that keyName \"+keyName+\" was not found\");\r\n        break; \/\/record this warning to the first node in the snapshot\r\n      }\r\n  }\r\n\r\n\r\n  \/\/if keyName is found multiple times then trigger an error making the decision non-compliant\r\n  \/\/TODO: in case it is found multiple times but their values are the same it is probably OK to continue\r\n  if (Number(nbrFound) > 1) {\r\n      var cdmQ = new sn_cmdb_ci_class.CdmQuery().version(\"latest\").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();\r\n      while (node = cdmQ.next()) {\r\n        sn_cdm.CdmPolicyUtil.addFailure(result, cdmQ, keyName + \" is not unique\", \"provided keyName [\"+keyName + \"] was found \" + nbrFound + \" times in the snapshot\", snapshotId);\r\n        break; \/\/record this warning to the first node in the snapshot\r\n      }\r\n  }\r\n\r\n  for(var d = 0; d < mappedInput.additionalDeployablesInput.length; d++) {\r\n    var otherDeplId = mappedInput.additionalDeployablesInput[d].id;\r\n    logger.info(\"= \"+keyName+\" in \"+mappedInput.additionalDeployablesInput[d].label)\r\n    \/\/ logic to retrieve details for the other deployable using glideRecord and dotWalk\r\n    var cdmDepGr = new GlideRecord(\"sg_cdm_deployable\");\r\n    cdmDepGr.get(otherDeplId);\r\n    var otherDeployableNodeName = cdmDepGr.node.name;\r\n    var otherAppName = cdmDepGr.cdm_app.name;\r\n    \/\/logger.info(\"other deployable: \"+ otherDeployableNodeName + \" | \"+ otherAppName);\r\n    \r\n    \/\/get the value for the key in other deployable \r\n    var cdmQa = new sn_cmdb_ci_class.CdmQuery().app(otherAppName).deployable(otherDeployableNodeName).followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).query();\r\n\r\n    while (node = cdmQa.next()) {\r\n      if(cdmQa.getValue(\"sys_class_name\") == \"sg_cdm_node_cdi\"){\r\n        \/\/logger.info(cdmQa.getValue(\'name\') + \" | \"+ cdmQa.getValue(\'value\'));\r\n        if (cdmQa.getValue(\'name\') === keyName) {\r\n          otherValue = sn_cmdb_ci_class.CdmUtil.getEffectiveValue(node);\r\n          logger.info(keyName + \" found in \" + otherDeployableNodeName + \" with value \" + otherValue);\r\n\r\n          if (primaryValue === otherValue){  \r\n              logger.info(\"!! \" + keyName + \" found in \" + otherDeployableNodeName + \" with same value \" + otherValue + \" primary value is \" + primaryValue + \" with snapshotId \" + snapshotId);  \r\n              cdmQ =  new sn_cmdb_ci_class.CdmQuery().version(\"latest\").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();\r\n              while (node = cdmQ.next()) {\r\n                sn_cdm.CdmPolicyUtil.addFailure(result, cdmQ, keyName + \" compliancy failure: duplicate value\", keyName + \" : \" + otherValue + \" is the same as in \" + otherDeployableNodeName, snapshotId);\r\n                break; \/\/break \r\n              }\r\n          }\r\n            break; \/\/once the key is found no need to continue looping\r\n        }\r\n      }\r\n    }\r\n  }\r\n  nbrFound = 0; \/\/reset the nbr of times the keyName was found in the principal snapshot\r\n}\r\n\r\n\/\/check if at least 1 test has failed, if so, set decision to non_compliant\r\nresult.decision = result.failures.length ? Constants.NON_COMPLIANT : Constants.COMPLIANT;\r\nreturn result;\r\n\r\n\r\n} )(logger, currentRecord, documentRecord, callerInput, mappedInput, childrenOutputs, result);\r\n';

var cdmCategoryId = _getOrCreateCategory('CDM', 'CDM Category')
gs.info('CDM Category = ' + cdmCategoryId);
var cdmPolicyId = _createPolicy(CDM_CALLING_SERVICE, cdmCategoryId, policyName, policyDescription);
gs.info('CDM Policy = ' + cdmPolicyId);
var draftVersionId = _getDraftVersion(cdmPolicyId, SCRIPT);
gs.info('Draft Version = ' + draftVersionId);

//set the input parameters
_createInput(draftVersionId, 'keyName', STRING_DATA_TYPE, "", false, true);

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