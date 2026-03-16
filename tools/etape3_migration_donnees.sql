UPDATE incident SET ref_bitrix = TRIM(observations) WHERE status = 'Bitrix' AND observations IS NOT NULL AND TRIM(observations) REGEXP '^[0-9]{5}$' AND LENGTH(TRIM(observations)) = 5;
