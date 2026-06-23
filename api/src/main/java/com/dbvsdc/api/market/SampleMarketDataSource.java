package com.dbvsdc.api.market;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Profile("!live")
public class SampleMarketDataSource implements MarketDataSource {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final double DEPOSIT_RATE = 0.03;
    private static final List<Integer> YEARS = List.of(
            1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004,
            2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014,
            2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024
    );
    private static final Map<String, List<Double>> RETURNS = createReturns();

    @Override
    public MarketDataResponse getIndexReturns() {
        return new MarketDataResponse(
                LocalDate.now(KST).toString(),
                "sample",
                DEPOSIT_RATE,
                YEARS,
                RETURNS
        );
    }

    public static MarketDataResponse sampleResponse() {
        return new MarketDataResponse(
                LocalDate.now(KST).toString(),
                "sample",
                DEPOSIT_RATE,
                YEARS,
                RETURNS
        );
    }

    private static Map<String, List<Double>> createReturns() {
        Map<String, List<Double>> returns = new LinkedHashMap<>();
        returns.put("sp", List.of(34.0, 20.0, 31.0, 27.0, 20.0, -10.0, -13.0, -23.0, 26.0, 9.0, 3.0, 13.6, 3.5, -38.5, 23.5, 12.8, 0.0, 13.4, 29.6, 11.4, -0.7, 9.5, 19.4, -6.2, 28.9, 16.3, 26.9, -19.4, 24.2, 23.3));
        returns.put("nq", List.of(40.0, 23.0, 22.0, 40.0, 86.0, -39.0, -21.0, -31.0, 50.0, 9.0, 1.4, 9.5, 9.8, -40.5, 43.9, 16.9, -1.8, 15.9, 38.3, 13.4, 5.7, 7.5, 28.2, -3.9, 35.2, 43.6, 21.4, -33.1, 43.4, 28.6));
        returns.put("dj", List.of(33.0, 26.0, 23.0, 16.0, 25.0, -6.0, -7.0, -17.0, 25.0, 3.0, -0.6, 16.3, 6.4, -33.8, 18.8, 11.0, 5.5, 7.3, 26.5, 7.5, -2.2, 13.4, 25.1, -5.6, 22.3, 7.2, 18.7, -8.8, 13.7, 12.9));
        returns.put("ks", List.of(-14.0, -26.0, -42.0, 49.0, 83.0, -51.0, 37.0, -10.0, 29.0, 10.0, 54.0, 4.0, 32.3, -40.7, 49.7, 21.9, -11.0, 9.4, 0.7, -4.8, 2.4, 3.3, 21.8, -17.3, 7.7, 30.8, 3.6, -24.9, 18.7, -9.6));
        returns.put("kq", List.of(0.0, -28.0, -43.0, 89.0, 241.0, -79.0, 37.0, -39.0, 1.0, -16.0, 84.0, -13.0, 16.0, -52.8, 54.7, 0.6, -1.5, 0.9, 0.7, 8.6, 25.7, -7.5, 26.4, -15.4, -0.9, 44.6, 6.8, -34.3, 27.6, -21.7));
        return Collections.unmodifiableMap(returns);
    }
}
