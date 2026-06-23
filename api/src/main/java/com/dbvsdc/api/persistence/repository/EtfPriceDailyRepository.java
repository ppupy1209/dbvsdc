package com.dbvsdc.api.persistence.repository;

import com.dbvsdc.api.persistence.entity.EtfPriceDaily;
import com.dbvsdc.api.persistence.entity.EtfPriceDailyId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EtfPriceDailyRepository extends JpaRepository<EtfPriceDaily, EtfPriceDailyId> {
}
