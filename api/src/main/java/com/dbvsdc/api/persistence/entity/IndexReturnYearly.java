package com.dbvsdc.api.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "index_return_yearly")
public class IndexReturnYearly {

    @EmbeddedId
    private IndexReturnYearlyId id;

    @Column(name = "return_pct", precision = 7, scale = 2, nullable = false)
    private BigDecimal returnPct;

    protected IndexReturnYearly() {
    }

    public IndexReturnYearly(IndexReturnYearlyId id, BigDecimal returnPct) {
        this.id = id;
        this.returnPct = returnPct;
    }

    public IndexReturnYearlyId getId() {
        return id;
    }

    public BigDecimal getReturnPct() {
        return returnPct;
    }
}
