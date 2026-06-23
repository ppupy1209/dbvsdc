package com.dbvsdc.api.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class IndexReturnYearlyId implements Serializable {

    @Column(name = "index_key", length = 8, nullable = false)
    private String indexKey;

    @Column(name = "year", nullable = false)
    private Short year;

    protected IndexReturnYearlyId() {
    }

    public IndexReturnYearlyId(String indexKey, Short year) {
        this.indexKey = indexKey;
        this.year = year;
    }

    public String getIndexKey() {
        return indexKey;
    }

    public Short getYear() {
        return year;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof IndexReturnYearlyId that)) {
            return false;
        }
        return Objects.equals(indexKey, that.indexKey) && Objects.equals(year, that.year);
    }

    @Override
    public int hashCode() {
        return Objects.hash(indexKey, year);
    }
}
