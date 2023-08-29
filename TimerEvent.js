/**
 * Timer Function
 *    following functions are called by trigger on GAS
 */

function TimerEventDaily() {

}

function TimerEventWeekly() {
    GetQAinfoFromWebPage()
    FAQ_ranking()
    FAQ_Logger()
}

function TimerEventMonthly() {
    RulzGA4_ReportMonthly()
}

