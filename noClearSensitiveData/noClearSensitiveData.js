/**
  @param logger: ExecutionLogger
  @param currentRecord: GlideRecord('sn_pace_policy_version')
  @param documentRecord: GlideRecord(documentTable), where documentTable is runtime value provided as a part of invocation
  @param callerInput: Object, passed as a invocation input
  @param mappedInput: Object, retrieved from application for the current run
  @param childrenOutputs: Array, stores outputs of children executions for the policy, where if present the first output is always a result of data collector, followed by outputs from other children policies
  @param result: Object - { decision: 'compliant/non_compliant', results: [], failures: [], warnings: [] } is exposed, where output of the script is stored
 */
 (function(logger, currentRecord, documentRecord, callerInput, mappedInput, childrenOutputs, result) {
 
//retrieve the input values
var snapshotId = callerInput.snapshotId;
var keyWords=mappedInput.keyWords;
logger.info("** list of keyWords the policy is using to recoginize senstive CDIs: "+keyWords);

//internal variables
var nbrFound = 0;
var nbrFailed = 0;
var node = "";
var keyWord = "";

var keyWordArr = keyWords.split(","); //convert input to array of keyNames

//logger.info("==== nbr of keywords : " + keyWordArr.length);

// start loop through the provided keyWords
for(var i = 0; i < keyWordArr.length; i++) {
  //reset the counters
  nbrFound=0;
  nbrFailed = 0;
  
  //perform comparison case insensitive
  keyWord = keyWordArr[i].toUpperCase().trim();
  logger.info("=== loop for keyword("+i+") : ["+keyWord+"]");

    //if an empty keyName was provided, throw a warning
  if (keyWord.length === 0) {
    var cdmQ = new sn_cmdb_ci_class.CdmQuery().version("latest").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();
    while (node = cdmQ.next()) {
      sn_cdm.CdmPolicyUtil.addWarning(result, cdmQ, "empty keyWord in input mapping", "check the mapping input settings. It should be a comma separated list of keyWords", snapshotId);
      logger.info("!!there is an empty keyName in the input mapping of keyWords");
      break; //record this warning to the first node in the snapshot
    }
  } else {
  
    //loop through snapshot and check for keyNames which contain the keyWord
    var cdmQ = new sn_cmdb_ci_class.CdmQuery().version("latest").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();
    while (node = cdmQ.next()) {
        if (cdmQ.getValue('name').toUpperCase().indexOf(keyWord) !== -1) {  
            nbrFound++;
            //check if such a CDI has a value different then undefined. If so it means the value is not encrypted
            if (typeof cdmQ.getValue('value') !== 'undefined'){ 
                logger.info("!! failure: "+cdmQ.getValue('name') + " contains substring " + keyWordArr[i] + " and should be encrypted.");
                sn_cdm.CdmPolicyUtil.addFailure(result, cdmQ, "compliancy violation", "value of " + cdmQ.getValue('name') + " is not encrypted", snapshotId);
                nbrFailed++;
            }
        }
    }
    logger.info("keyWord " + keyWordArr[i] + " was found " +nbrFound + " times of which "+nbrFailed+" failures" );
  }
}

//check if at least 1 test has failed, if so, set decision to non_compliant
result.decision = result.failures.length ? Constants.NON_COMPLIANT : Constants.COMPLIANT;
return result;
  
} )(logger, currentRecord, documentRecord, callerInput, mappedInput, childrenOutputs, result);
