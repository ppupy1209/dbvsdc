package com.dbvsdc.api.persistence.repository;

import com.dbvsdc.api.persistence.entity.IndexReturnYearly;
import com.dbvsdc.api.persistence.entity.IndexReturnYearlyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface IndexReturnYearlyRepository extends JpaRepository<IndexReturnYearly, IndexReturnYearlyId> {

    @Query("select r from IndexReturnYearly r order by r.id.year asc, r.id.indexKey asc")
    List<IndexReturnYearly> findAllOrdered();
}
