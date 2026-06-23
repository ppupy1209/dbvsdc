package com.dbvsdc.api.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "etf_price_daily")
public class EtfPriceDaily {

    @EmbeddedId
    private EtfPriceDailyId id;

    @Column(name = "close_price", precision = 15, scale = 2, nullable = false)
    private BigDecimal closePrice;

    protected EtfPriceDaily() {
    }

    public EtfPriceDaily(EtfPriceDailyId id, BigDecimal closePrice) {
        this.id = id;
        this.closePrice = closePrice;
    }

    public EtfPriceDailyId getId() {
        return id;
    }

    public BigDecimal getClosePrice() {
        return closePrice;
    }
}
