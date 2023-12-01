/**
 * Timer Function
 *    following functions are called by trigger on GAS
 */

function TimerEventDaily() {
    RulzScrape_GetForumData_Daily()
    RulzScrape_GetReplyData_Daily()
}

function TimerEventWeekly() {
    RulzFollowUp_RulzSendFollowUpMail()
    RulzScrape_GetQAinfoFromWebPage()
    FAQ_ranking()
    FAQ_Logger()
    FAQ_AccessDomainData()
}

function TimerEventMonthly() {
    RulzGA4_ReportMonthly()
}

