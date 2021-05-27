var policyName = 'noClearSensitiveData';
var policyDescription = 'validates for keyNames with a given keyWord pattern are encrypted';
var CDM_CALLING_SERVICE = '30e03cd973532010af8a1fd9fdf6a727';
var INT_DATA_TYPE = 'aab367c1bf3320001875647fcf073909';
var STRING_DATA_TYPE = '747127c1bf3320001875647fcf0739e0';
var SCRIPT = '\/**\r\n  @param logger: ExecutionLogger\r\n  @param currentRecord: GlideRecord(\'sn_pace_policy_version\')\r\n  @param documentRecord: GlideRecord(documentTable), where documentTable is runtime value provided as a part of invocation\r\n  @param callerInput: Object, passed as a invocation input\r\n  @param mappedInput: Object, retrieved from application for the current run\r\n  @param childrenOutputs: Array, stores outputs of children executions for the policy, where if present the first output is always a result of data collector, followed by outputs from other children policies\r\n  @param result: Object - { decision: \'compliant\/non_compliant\', results: [], failures: [], warnings: [] } is exposed, where output of the script is stored\r\n *\/\r\n (function(logger, currentRecord, documentRecord, callerInput, mappedInput, childrenOutputs, result) {\r\n \r\n\/\/retrieve the input values\r\nvar snapshotId = callerInput.snapshotId;\r\nvar keyWords=mappedInput.keyWords;\r\nlogger.info(\"** list of keyWords the policy is using to recoginize senstive CDIs: \"+keyWords);\r\n\r\n\/\/internal variables\r\nvar nbrFound = 0;\r\nvar nbrFailed = 0;\r\nvar node = \"\";\r\nvar keyWord = \"\";\r\n\r\nvar keyWordArr = keyWords.split(\",\"); \/\/convert input to array of keyNames\r\n\r\n\/\/logger.info(\"==== nbr of keywords : \" + keyWordArr.length);\r\n\r\n\/\/ start loop through the provided keyWords\r\nfor(var i = 0; i < keyWordArr.length; i++) {\r\n  \/\/reset the counters\r\n  nbrFound=0;\r\n  nbrFailed = 0;\r\n  \r\n  \/\/perform comparison case insensitive\r\n  keyWord = keyWordArr[i].toUpperCase().trim();\r\n  logger.info(\"=== loop for keyword(\"+i+\") : [\"+keyWord+\"]\");\r\n\r\n    \/\/if an empty keyName was provided, throw a warning\r\n  if (keyWord.length === 0) {\r\n    var cdmQ = new sn_cmdb_ci_class.CdmQuery().version(\"latest\").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();\r\n    while (node = cdmQ.next()) {\r\n      sn_cdm.CdmPolicyUtil.addWarning(result, cdmQ, \"empty keyWord in input mapping\", \"check the mapping input settings. It should be a comma separated list of keyWords\", snapshotId);\r\n      logger.info(\"!!there is an empty keyName in the input mapping of keyWords\");\r\n      break; \/\/record this warning to the first node in the snapshot\r\n    }\r\n  } else {\r\n  \r\n    \/\/loop through snapshot and check for keyNames which contain the keyWord\r\n    var cdmQ = new sn_cmdb_ci_class.CdmQuery().version(\"latest\").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();\r\n    while (node = cdmQ.next()) {\r\n        if (cdmQ.getValue(\'name\').toUpperCase().indexOf(keyWord) !== -1) {  \r\n            nbrFound++;\r\n            \/\/check if such a CDI has a value different then undefined. If so it means the value is not encrypted\r\n            if (typeof cdmQ.getValue(\'value\') !== \'undefined\'){ \r\n                logger.info(\"!! failure: \"+cdmQ.getValue(\'name\') + \" contains substring \" + keyWordArr[i] + \" and should be encrypted.\");\r\n                sn_cdm.CdmPolicyUtil.addFailure(result, cdmQ, \"compliancy violation\", \"value of \" + cdmQ.getValue(\'name\') + \" is not encrypted\", snapshotId);\r\n                nbrFailed++;\r\n            }\r\n        }\r\n    }\r\n    logger.info(\"keyWord \" + keyWordArr[i] + \" was found \" +nbrFound + \" times of which \"+nbrFailed+\" failures\" );\r\n  }\r\n}\r\n\r\n\/\/check if at least 1 test has failed, if so, set decision to non_compliant\r\nresult.decision = result.failures.length ? Constants.NON_COMPLIANT : Constants.COMPLIANT;\r\nreturn result;\r\n  \r\n} )(logger, currentRecord, documentRecord, callerInput, mappedInput, childrenOutputs, result);\r\n';

var cdmCategoryId = _getOrCreateCategory('CDM', 'CDM Category')
gs.info('CDM Category = ' + cdmCategoryId);
var cdmPolicyId = _createPolicy(CDM_CALLING_SERVICE, cdmCategoryId, policyName, policyDescription);
gs.info('CDM Policy = ' + cdmPolicyId);
var draftVersionId = _getDraftVersion(cdmPolicyId, SCRIPT);
gs.info('Draft Version = ' + draftVersionId);

//set the input parameters
_createInput(draftVersionId, 'keyWords', STRING_DATA_TYPE, "password,pwd", true, true);

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