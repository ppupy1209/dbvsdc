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
            2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024,
            2025
    );
    private static final Map<String, List<Double>> RETURNS = createReturns();

    @Override
    public MarketDataResponse getIndexReturns() {
        return new MarketDataResponse(
                LocalDate.now(KST).toString(),
                "sample",
                "gross_total_return",
                "local",
                true,
                false,
                DEPOSIT_RATE,
                YEARS,
                RETURNS
        );
    }

    public static MarketDataResponse sampleResponse() {
        return new MarketDataResponse(
                LocalDate.now(KST).toString(),
                "sample",
                "gross_total_return",
                "local",
                true,
                false,
                DEPOSIT_RATE,
                YEARS,
                RETURNS
        );
    }

    private static Map<String, List<Double>> createReturns() {
        Map<String, List<Double>> returns = new LinkedHashMap<>();
        returns.put("sp", List.of(37.58, 22.96, 33.36, 28.58, 21.04, -9.1, -11.89, -22.1, 28.68, 10.88, 4.91, 15.79, 5.49, -37.0, 26.46, 15.06, 2.11, 16.0, 32.39, 13.69, 1.38, 11.96, 21.83, -4.38, 31.49, 18.4, 28.71, -18.11, 26.29, 25.02, 17.88));
        returns.put("nq", List.of(43.34, 43.34, 21.43, 86.11, 102.75, -36.04, -31.85, -36.78, 49.92, 11.24, 2.29, 7.59, 19.47, -41.09, 54.34, 20.02, 3.5, 17.62, 35.79, 18.74, 9.23, 6.69, 32.32, -0.24, 38.76, 48.38, 27.43, -32.17, 54.61, 25.68, 20.97));
        returns.put("dj", List.of(35.55, 28.11, 24.74, 18.2, 27.32, -4.07, -5.0, -14.66, 27.42, 5.25, 1.49, 18.39, 8.53, -31.74, 20.92, 13.12, 7.63, 9.36, 28.6, 9.62, -0.13, 15.52, 27.18, -3.53, 24.44, 9.35, 20.83, -6.68, 15.8, 14.98, 15.07));
        returns.put("ks", List.of(-12.2, -24.2, -40.2, 50.8, 84.8, -49.2, 38.8, -8.2, 30.8, 11.8, 55.8, 5.8, 34.1, -38.9, 51.5, 23.7, -9.2, 11.2, 2.5, -3.0, 4.2, 5.1, 23.6, -15.5, 9.5, 32.6, 5.4, -23.1, 20.5, -7.8, 77.4));
        returns.put("kq", List.of(0.6, -27.4, -42.4, 89.6, 241.6, -78.4, 37.6, -38.4, 1.6, -15.4, 84.6, -12.4, 16.6, -52.2, 55.3, 1.2, -0.9, 1.5, 1.3, 9.2, 26.3, -6.9, 27.0, -14.8, -0.3, 45.2, 7.4, -33.7, 28.2, -21.1, 37.1));
        return Collections.unmodifiableMap(returns);
    }
}
