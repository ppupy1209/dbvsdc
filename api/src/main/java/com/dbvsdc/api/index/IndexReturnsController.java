package com.dbvsdc.api.index;

import com.dbvsdc.api.market.MarketDataResponse;
import com.dbvsdc.api.market.MarketDataSource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class IndexReturnsController {

    private final MarketDataSource marketDataSource;

    public IndexReturnsController(MarketDataSource marketDataSource) {
        this.marketDataSource = marketDataSource;
    }

    @GetMapping("/index-returns")
    public MarketDataResponse indexReturns() {
        return marketDataSource.getIndexReturns();
    }
}
