(function(logger, currentRecord, documentRecord, callerInput, mappedInput, childrenOutputs, result) {

snapshotId=callerInput.snapshotId;

var cdmQ = new sn_cmdb_ci_class.CdmQuery().version("latest").followIncludes(true).decryptPassword(true).substituteVariable(true).useCache(true).snapshotId(snapshotId).query();
    
while (node = cdmQ.next()) {
    if(cdmQ.getValue("sys_class_name") == "sg_cdm_node_cdi"){ //only check for CDIs, nodes are not relevant
        if (typeof cdmQ.getValue('value') !== 'undefined'){
            if (cdmQ.getValue('value').indexOf('@@') !== -1) {
                logger.info("unresolved variable detected for " + cdmQ.getValue('name') + " | "+ cdmQ.getValue('value'));
                sn_cdm.CdmPolicyUtil.addFailure(result, cdmQ, "unresolved variable", "unresolved variable detected for " + cdmQ.getValue('name') + " | "+ cdmQ.getValue('value'), snapshotId);
            }
        }
    }
  }
//check if at least 1 test has failed, if so, set decision to non_compliant
result.decision = result.failures.length ? Constants.NON_COMPLIANT : Constants.COMPLIANT;
return result;

} )(logger, currentRecord, documentRecord, callerInput, mappedInput, childrenOutputs, result);
 