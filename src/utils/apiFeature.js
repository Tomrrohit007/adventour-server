class APIFeatures {
    constructor(query, queryString) {
      this.query = query;
      this.queryString = queryString;
    }
    filter() {
      const queryObj = { ...this.queryString };
      const excludeArray = ["page", "sort", "limit", "fields"];
      excludeArray.forEach((el) => delete queryObj[el]);
  
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(lt|lte|gt|gte)\b/g, (each) => `$${each}`);
      const parseQueryObj = JSON.parse(queryStr);
      this.query.find(parseQueryObj)
      return this;
    }
  
    sort() {
      let sorting;
      if (this.queryString.sort) {
        sorting = this.queryString.sort.split(",").join(" ");
      } else {
        sorting = "price";
      }
      this.query.sort(sorting);
      return this;
    }
  
    limitFields() {
      let fields = "-__v";
      if (this.queryString.fields) {
        fields = this.queryString.fields.split(",").join(" ");
      }
      this.query.select(fields);
      return this;
    }
  
    pagination() {
      const page = this.queryString.page - 1 || 0;
      const limit = this.queryString.limit;
      const skips = page * limit;
      this.query.skip(skips).limit(limit);
      return this;
    }
  }

  module.exports = APIFeatures 