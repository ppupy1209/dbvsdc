package com.dbvsdc.api.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;

@Embeddable
public class EtfPriceDailyId implements Serializable {

    @Column(name = "index_key", length = 8, nullable = false)
    private String indexKey;

    @Column(name = "trade_date", nullable = false)
    private LocalDate tradeDate;

    protected EtfPriceDailyId() {
    }

    public EtfPriceDailyId(String indexKey, LocalDate tradeDate) {
        this.indexKey = indexKey;
        this.tradeDate = tradeDate;
    }

    public String getIndexKey() {
        return indexKey;
    }

    public LocalDate getTradeDate() {
        return tradeDate;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof EtfPriceDailyId that)) {
            return false;
        }
        return Objects.equals(indexKey, that.indexKey) && Objects.equals(tradeDate, that.tradeDate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(indexKey, tradeDate);
    }
}
