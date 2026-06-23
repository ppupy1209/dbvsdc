package com.dbvsdc.api.market;

import com.dbvsdc.api.persistence.entity.IndexReturnYearly;
import com.dbvsdc.api.persistence.repository.AppConfigRepository;
import com.dbvsdc.api.persistence.repository.IndexReturnYearlyRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Profile("live")
public class LiveMarketDataSource implements MarketDataSource {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final List<String> INDEX_KEYS = List.of("sp", "nq", "dj", "ks", "kq");
    private static final double DEFAULT_DEPOSIT_RATE = 0.03;

    private final IndexReturnYearlyRepository returnsRepository;
    private final AppConfigRepository appConfigRepository;

    public LiveMarketDataSource(IndexReturnYearlyRepository returnsRepository, AppConfigRepository appConfigRepository) {
        this.returnsRepository = returnsRepository;
        this.appConfigRepository = appConfigRepository;
    }

    @Override
    public MarketDataResponse getIndexReturns() {
        List<IndexReturnYearly> rows = returnsRepository.findAllOrdered();
        if (rows.isEmpty()) {
            // TODO: remove this fallback once the live KRX/data.go.kr/KIS ingestion is implemented.
            return SampleMarketDataSource.sampleResponse();
        }

        Set<Integer> yearSet = new LinkedHashSet<>();
        Map<String, Map<Integer, Double>> byIndex = new LinkedHashMap<>();
        for (String key : INDEX_KEYS) {
            byIndex.put(key, new LinkedHashMap<>());
        }

        for (IndexReturnYearly row : rows) {
            String indexKey = row.getId().getIndexKey();
            if (!byIndex.containsKey(indexKey)) {
                continue;
            }
            int year = row.getId().getYear();
            yearSet.add(year);
            byIndex.get(indexKey).put(year, row.getReturnPct().doubleValue());
        }

        List<Integer> years = new ArrayList<>(yearSet);
        Collections.sort(years);

        Map<String, List<Double>> returns = new LinkedHashMap<>();
        for (String key : INDEX_KEYS) {
            Map<Integer, Double> valuesByYear = byIndex.get(key);
            if (!valuesByYear.keySet().containsAll(years)) {
                return SampleMarketDataSource.sampleResponse();
            }
            returns.put(key, years.stream().map(valuesByYear::get).toList());
        }

        return new MarketDataResponse(
                LocalDate.now(KST).toString(),
                "live",
                depositRate(),
                years,
                returns
        );
    }

    private double depositRate() {
        return appConfigRepository.findById("depositRate")
                .map(config -> Double.parseDouble(config.getCfgValue()))
                .orElse(DEFAULT_DEPOSIT_RATE);
    }
}
