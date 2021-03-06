import get from "lodash/get";
import { handleScreenConfigurationFieldChange as handleField, prepareFinalObject } from "egov-ui-framework/ui-redux/screen-configuration/actions";
import { toggleSnackbar } from "egov-ui-framework/ui-redux/screen-configuration/actions";
import { getPropertyResults } from "../../../../../ui-utils/commons";
import { getTenantId, getUserInfo } from "egov-ui-kit/utils/localStorageUtils";

export const propertySearchApiCall = async (state, dispatch) => {
  showHideFields(dispatch, false);
  let tenantId = process.env.REACT_APP_NAME === "Citizen"?JSON.parse(getUserInfo()).permanentCity:getTenantId();
  let queryObject = [{ key: "tenantId", value: tenantId }];
  let searchScreenObject = get(state.screenConfiguration.preparedFinalObject, "searchScreen", {});
  dispatch(
    handleField(
      "apply",
      "components.div.children.formwizardFirstStep.children.ownerDetails.children.cardContent.children.ownerDetail.children.cardContent.children.headerDiv",
      "props.items",
      []
    )
  );
  dispatch(
    prepareFinalObject(
      "applyScreen.property",
      {}
    )
  );
  if (
    Object.keys(searchScreenObject).length == 0 ||
    Object.values(searchScreenObject).every(x => x === "")
  ) {
    dispatch(toggleSnackbar(true, { labelKey: "WS_FILL_REQUIRED_FIELDS", labelName: "Please fill required details" }, "warning"));
  } else {
    for (var key in searchScreenObject) {
      if (searchScreenObject.hasOwnProperty(key) && searchScreenObject[key].trim() !== "") {
        queryObject.push({ key: key, value: searchScreenObject[key].trim() });
      }
    }
    try {
      let allowCitizenToSearchOtherProperties = get(
        state
          .screenConfiguration
          .preparedFinalObject
          .applyScreenMdmsData["ws-services-masters"],
        "PropertySearch", []
      )
        .map(a => a.code === "allowCitizenToUseAnyProperty")[0];
      if (
        process.env.REACT_APP_NAME === "Citizen" &&
        !allowCitizenToSearchOtherProperties
      ) {
        queryObject.push({ key: "mobileNumber", value: JSON.parse(getUserInfo()).mobileNumber })
      }
      let response = await getPropertyResults(queryObject, dispatch);
      if (response && response.Properties.length > 0) {
        if(response.Properties[0].status === 'INACTIVE'){
          dispatch(toggleSnackbar(true, { labelKey: "ERR_WS_PROP_STATUS_INACTIVE", labelName: "Property Status is INACTIVE" }, "warning"));
        }else{
          let propertyData = response.Properties[0];
          let contractedCorAddress = "";

          if(propertyData.address.doorNo !== null && propertyData.address.doorNo !== ""){
            contractedCorAddress += propertyData.address.doorNo + ", ";
          }
          if(propertyData.address.buildingName !== null && propertyData.address.buildingName !== ""){
            contractedCorAddress += propertyData.address.buildingName + ", ";
          }        
          contractedCorAddress += propertyData.address.locality.name + ", " + propertyData.address.city;

          for(var i=0; i<propertyData.owners.length;i++){ 
            if(propertyData.owners[i].correspondenceAddress == 'NA' || propertyData.owners[i].correspondenceAddress == null || propertyData.owners[i].correspondenceAddress == ""){
              if(propertyData.owners[i].permanentAddress == 'NA' || propertyData.owners[i].permanentAddress == null || propertyData.owners[i].permanentAddress == ""){
                propertyData.owners[i].correspondenceAddress = contractedCorAddress;
              }else{
                propertyData.owners[i].correspondenceAddress = propertyData.owners[i].permanentAddress;
              }
            }    
          }
          dispatch(prepareFinalObject("applyScreen.property", propertyData))
          showHideFields(dispatch, true);
        }
      } else {
        showHideFields(dispatch, false);
        dispatch(toggleSnackbar(true, { labelKey: "ERR_WS_PROP_NOT_FOUND", labelName: "No Property records found" }, "warning"));
      }
    } catch (err) {
      showHideFields(dispatch, false);
      console.log(err)
    }
  }
}

const showHideFields = (dispatch, value) => {
  dispatch(
    handleField(
      "apply",
      "components.div.children.formwizardFirstStep.children.IDDetails.children.cardContent.children.propertyIDDetails",
      "visible",
      value
    )
  );
  dispatch(
    handleField(
      "apply",
      "components.div.children.formwizardFirstStep.children.Details",
      "visible",
      value
    )
  );
  dispatch(
    handleField(
      "apply",
      "components.div.children.formwizardFirstStep.children.ownerDetails",
      "visible",
      value
    )
  );
}