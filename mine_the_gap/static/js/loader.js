//  Create and show loader graphic - waiting for something

export function drawLoader(loaderOuterDivId, newLoaderDivId, explanation, sizeOneToFive=3){
    let loaderOuterDiv = document.getElementById(loaderOuterDivId);
    let loaderDiv = document.createElement('div');
    loaderDiv.id = newLoaderDivId;
    loaderOuterDiv.appendChild(loaderDiv);

    loaderDiv.style.zIndex = 2000;
    let strClassSuffix = '';
    if(parseInt(sizeOneToFive) >=1 & parseInt(sizeOneToFive) <=5) {
        strClassSuffix = ' size-' + sizeOneToFive.toString();
    }

    // Delete previous if exists
    if($(loaderDiv).children(".ajax-waiting-explanation").length){
        // Remove
        $(loaderDiv).children(".ajax-waiting-explanation").remove();
    }

    // Draw new loader
    let divWaitingExplanation = document.createElement('div');
    divWaitingExplanation.className = 'ajax-waiting-explanation';
    let divAjaxWaitText = document.createElement('div');
    divAjaxWaitText.className = 'ajax-waiting-text' + strClassSuffix;
    divAjaxWaitText.innerHTML = explanation;
    let divLoader = document.createElement('div');
    divLoader.className = 'ajax-call-loader' + strClassSuffix;
    divWaitingExplanation.appendChild(divLoader);
    divWaitingExplanation.appendChild(divAjaxWaitText);
    loaderDiv.appendChild(divWaitingExplanation);
}

//  Stop loader graphic - finished waiting for something

export function stopLoader(loaderOuterDivId) {
    document.getElementById(loaderOuterDivId).innerHTML = '';
}