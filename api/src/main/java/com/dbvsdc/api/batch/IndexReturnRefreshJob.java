package com.dbvsdc.api.batch;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Profile("live")
public class IndexReturnRefreshJob {

    private static final Logger log = LoggerFactory.getLogger(IndexReturnRefreshJob.class);

    @Scheduled(cron = "0 0 18 * * *", zone = "Asia/Seoul")
    public void refreshIndexReturns() {
        // TODO: fetch KRX/data.go.kr/KIS daily ETF prices, upsert etf_price_daily,
        // calculate yearly returns, upsert index_return_yearly, and write sync_log.
        log.info("Index return refresh job is not implemented yet; leaving cached data unchanged.");
    }
}
