//  Create and show loader graphic - waiting for something

export class LoaderDisplay {
    constructor(outerDivId, explanation, newDivId='loader',  sizeOneToFive=3){
        let outerDiv = document.getElementById(outerDivId);
        let loaderDiv = document.createElement('div');
        loaderDiv.id = newDivId;
        outerDiv.appendChild(loaderDiv);

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
        this.divAjaxWaitText = document.createElement('div');
        this.divAjaxWaitText.className = 'ajax-waiting-text' + strClassSuffix;
        this.divAjaxWaitText.innerHTML = explanation;
        let divLoader = document.createElement('div');
        divLoader.className = 'ajax-call-loader' + strClassSuffix;
        divWaitingExplanation.appendChild(divLoader);
        divWaitingExplanation.appendChild(this.divAjaxWaitText);
        loaderDiv.appendChild(divWaitingExplanation);
    }

    //  Stop loader graphic - finished waiting for something
    stopLoader(outerDivId){
        document.getElementById(outerDivId).innerHTML = '';
    }

    setMessage(messageHTML){
        //alert(messageHTML);
        this.divAjaxWaitText.innerHTML = messageHTML;
    }
}