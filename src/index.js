import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import fs from 'fs/promises';
import xml2js from 'xml2js';
import { JSONPath } from 'jsonpath-plus';


// Helper function to parse XML file into a clean JS object
async function parseXMLDatatoJSON(xmlPath) {
  const xmlData = await fs.readFile('./src/24405.xml', 'utf-8');
  // explicitCharkey forces text nodes into clean strings
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
  const result = await parser.parseStringPromise(xmlData);
  return result; 
}


async function getJSONByPath(jsonData,jsonPath) {
  const itemList = await getValueByPath(jsonData,jsonPath);
  return Array.isArray(itemList) ? itemList : [itemList];
}

// Function that accepts a target object and a JSON path string
async function getValueByPath(obj, pathString) {
  // Normalize bracket notation '.[0]' or '[0]' to standard dot paths '.0'
  const normalizedPath = pathString.replace(/\[(\d+)\]/g, '.$1');
  const pathKeys = normalizedPath.split('.').filter(Boolean);

  // Traverse the object step by step
  return pathKeys.reduce((currentLevel, key) => {
    return (currentLevel && currentLevel[key] !== undefined) ? currentLevel[key] : undefined;
  }, obj);
}

const findNodeById = (node, targetId) => {
  if (node.id === targetId) return node;
  
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const found = findNodeById(child, targetId);
      if (found) return found;
    }
  }
  return null;
};
//const parentNode = findNodeById(treeData, 2);

// Automates generation of basic getters for each top-level JSON key
const generateResolvers = (dataSource) => {
  const queryResolvers = {};

  Object.keys(dataSource).forEach((key) => {
    
    //console.log(key);
    // Dynamically names the resolver (e.g., "getBooks", "getAuthors")
    const resolverName = `get${key.charAt(0).toUpperCase() + key.slice(1)}`;
    
    queryResolvers[resolverName] = () => dataSource[key];
  });

  return { Query: queryResolvers };
};
//const dynamicResolvers = generateResolvers(jsonData.restaurant);









// Create JSON from XML Input
const jsonData = await parseXMLDatatoJSON('./src/24405.xml');

// Pull object data for tables
const categories = await getJSONByPath(jsonData,'restaurant.menu.categories');

// Type Definitions (Schema)
const typeDefs = `#graphql
  type Category {
    id: ID!
    name: String!
    extref: String!
    products: Products
  }
  type Categories {
    category: [Category!]!
  }
  type Product {
    id: ID!
    name: String
    parentId: String
  }
  type Products {
    product: [Product!]
  }
  type Query {
    categories: [Category]
    category(id: ID!): Category
    products: [Product]
    product(id: ID!): Product
  }

  type Mutation {
    createCategory(name: String!, extref: String!): Category!
  }
`;


// Resolvers
const resolvers = {
  Query: {
    categories: () => categories
  },  
  Category: {
    products: (parent) => 
      parent.products.product
  }, 
  Mutation: {
    createCategory: (_, { name, extref }) => {
      const newCategory = { type: String(categories.length + 1), name, extref };
      categories.push(newCategory);
      return newCategory;
    }
  }
};


// Server Initialization
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀 Server ready at: ${url}`);
