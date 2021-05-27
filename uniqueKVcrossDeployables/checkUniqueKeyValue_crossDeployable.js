/**
  @param logger: ExecutionLogger
  @param currentRecord: GlideRecord('sn_pace_policy_version')
  @param documentRecord: GlideRecord(documentTable), where documentTable is runtime value provided as a part of invocation
  @param callerInput: Object, passed as a invocation input
  @param mappedInput: Object, retrieved from application for the current run
  @param childrenOutputs: Array, stores outputs of children executions for the policy, where if present the first output is always a result of data collector, followed by outputs from other children policies
  @param result: Object - { decision: 'compliant/non_compliant', results: [], errors: [], warnings: [] } is exposed, where output of the script is stored
 */
 (function(logger, currentRecord, documentRecord, callerInput, mappedInput, childrenOutputs, result) {
  
//retrieve the input values
var snapshotId = callerInput.snapshotId;
var keyNameArr = mappedInput.keyName.split(","); //convert input to array of keyNames

//internal variables
var nbrFound = 0;
var node = "0";

// start loop through the provided keyNames
for(var i = 0; i < keyNameArr.length; i++) {
  
  //get the keyName to compare
  keyName = keyNameArr[i].trim(); //remove any whitespace characters
  logger.info("=== keyName "+i+" :["+keyName+"] ===");

  //if an empty keyName was provided, throw a warning
  if (keyName.length === 0) {
      var cdmQ = new sn_cmdb_ci_class.CdmQuery().version("latest").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();
      while (node = cdmQ.next()) {
        sn_cdm.CdmPolicyUtil.addWarning(result, cdmQ, "empty keyName in input mapping", "check the mapping input settings - there is an empty keyName", snapshotId);
        logger.info("!!there is an empty keyName in the input mapping");
        break; //record this warning to the first node in the snapshot
      }
  }

  //if no additional deployables have been passed on, throw a failure.
  if (mappedInput.additionalDeployablesInput.length === 0) {
      var cdmQ = new sn_cmdb_ci_class.CdmQuery().version("latest").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();
      while (node = cdmQ.next()) {
        sn_cdm.CdmPolicyUtil.addFailure(result, cdmQ, "no additional deployables selected", "check the mapping input settings - there must be at least 1 additional deployable to compare with", snapshotId);
        logger.info("!!there are no additional deployables set in the input mapping");
        result.decision = result.failures.length ? Constants.NON_COMPLIANT : Constants.COMPLIANT;
        return result;
      }
  }

  //first get the value for the key in the primary deployable
  var cdmQ = new sn_cmdb_ci_class.CdmQuery().version("latest").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();
  while (node = cdmQ.next()) {
    if (cdmQ.getValue('name') === keyName) {
        primaryValue = sn_cmdb_ci_class.CdmUtil.getEffectiveValue(node);
        logger.info(keyName + " found with value " + sn_cmdb_ci_class.CdmUtil.getEffectiveValue(node));
        nbrFound++;
    }
  }

  //if keyName is not found in the snapshot then trigger a warning
  //reRun the cdmQ as an impacted node must be passed on to create the warning and there seems no other option to "reset" the while loop
  //this will record the warning on the first node of the snapshot
  logger.info(keyName + " was found " +nbrFound + " times");
  if (Number(nbrFound) === 0) {
      var cdmQ = new sn_cmdb_ci_class.CdmQuery().version("latest").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();
      while (node = cdmQ.next()) {
        sn_cdm.CdmPolicyUtil.addWarning(result, cdmQ, "keyName ["+keyName + "] was not found", "provided keyName ["+keyName + "] in the mapping input was not found in the snapshot", snapshotId);
        logger.info("!! throwing warning that keyName "+keyName+" was not found");
        break; //record this warning to the first node in the snapshot
      }
  }


  //if keyName is found multiple times then trigger an error making the decision non-compliant
  //TODO: in case it is found multiple times but their values are the same it is probably OK to continue
  if (Number(nbrFound) > 1) {
      var cdmQ = new sn_cmdb_ci_class.CdmQuery().version("latest").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();
      while (node = cdmQ.next()) {
        sn_cdm.CdmPolicyUtil.addFailure(result, cdmQ, keyName + " is not unique", "provided keyName ["+keyName + "] was found " + nbrFound + " times in the snapshot", snapshotId);
        break; //record this warning to the first node in the snapshot
      }
  }

  for(var d = 0; d < mappedInput.additionalDeployablesInput.length; d++) {
    var otherDeplId = mappedInput.additionalDeployablesInput[d].id;
    logger.info("= "+keyName+" in "+mappedInput.additionalDeployablesInput[d].label)
    // logic to retrieve details for the other deployable using glideRecord and dotWalk
    var cdmDepGr = new GlideRecord("sg_cdm_deployable");
    cdmDepGr.get(otherDeplId);
    var otherDeployableNodeName = cdmDepGr.node.name;
    var otherAppName = cdmDepGr.cdm_app.name;
    //logger.info("other deployable: "+ otherDeployableNodeName + " | "+ otherAppName);
    
    //get the value for the key in other deployable 
    var cdmQa = new sn_cmdb_ci_class.CdmQuery().app(otherAppName).deployable(otherDeployableNodeName).followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).query();

    while (node = cdmQa.next()) {
      if(cdmQa.getValue("sys_class_name") == "sg_cdm_node_cdi"){
        //logger.info(cdmQa.getValue('name') + " | "+ cdmQa.getValue('value'));
        if (cdmQa.getValue('name') === keyName) {
          otherValue = sn_cmdb_ci_class.CdmUtil.getEffectiveValue(node);
          logger.info(keyName + " found in " + otherDeployableNodeName + " with value " + otherValue);

          if (primaryValue === otherValue){  
              logger.info("!! " + keyName + " found in " + otherDeployableNodeName + " with same value " + otherValue + " primary value is " + primaryValue + " with snapshotId " + snapshotId);  
              cdmQ =  new sn_cmdb_ci_class.CdmQuery().version("latest").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();
              while (node = cdmQ.next()) {
                sn_cdm.CdmPolicyUtil.addFailure(result, cdmQ, keyName + " compliancy failure: duplicate value", keyName + " : " + otherValue + " is the same as in " + otherDeployableNodeName, snapshotId);
                break; //break 
              }
          }
            break; //once the key is found no need to continue looping
        }
      }
    }
  }
  nbrFound = 0; //reset the nbr of times the keyName was found in the principal snapshot
}

//check if at least 1 test has failed, if so, set decision to non_compliant
result.decision = result.failures.length ? Constants.NON_COMPLIANT : Constants.COMPLIANT;
return result;


} )(logger, currentRecord, documentRecord, callerInput, mappedInput, childrenOutputs, result);
