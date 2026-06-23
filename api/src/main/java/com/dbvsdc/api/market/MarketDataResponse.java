package com.dbvsdc.api.market;

import java.util.List;
import java.util.Map;

public record MarketDataResponse(
        String asOf,
        String source,
        double depositRate,
        List<Integer> years,
        Map<String, List<Double>> returns
) {
}
