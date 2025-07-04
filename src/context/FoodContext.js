import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultFoods } from '../data/defaultFoods';
import { CalculationService } from '../services/calculationService';

const FoodContext = createContext();

const ACTIONS = {
  LOAD_FOODS: 'LOAD_FOODS',
  ADD_FOOD: 'ADD_FOOD',
  UPDATE_FOOD: 'UPDATE_FOOD',
  DELETE_FOOD: 'DELETE_FOOD',
  SEARCH_FOODS: 'SEARCH_FOODS',
  UPDATE_LAST_USED: 'UPDATE_LAST_USED',
  CREATE_DISH: 'CREATE_DISH'
};

function foodReducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD_FOODS:
      return {
        ...state,
        foods: action.payload,
        filteredFoods: action.payload,
        loading: false
      };
    
    case ACTIONS.ADD_FOOD:
      const newFood = {
        ...action.payload,
        id: Date.now().toString(),
        userAdded: true,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      };
      const updatedFoods = [...state.foods, newFood];
      return {
        ...state,
        foods: updatedFoods,
        filteredFoods: updatedFoods
      };
    
    case ACTIONS.UPDATE_FOOD:
      const updated = state.foods.map(food => 
        food.id === action.payload.id ? { ...food, ...action.payload } : food
      );
      return {
        ...state,
        foods: updated,
        filteredFoods: updated
      };
    
    case ACTIONS.DELETE_FOOD:
      const filtered = state.foods.filter(food => food.id !== action.payload);
      return {
        ...state,
        foods: filtered,
        filteredFoods: filtered
      };
    
    case ACTIONS.SEARCH_FOODS:
      const searchTerm = action.payload.toLowerCase();
      const searchResults = state.foods.filter(food =>
        food.name.toLowerCase().includes(searchTerm) ||
        food.category.toLowerCase().includes(searchTerm)
      );
      return {
        ...state,
        filteredFoods: searchResults,
        searchTerm: action.payload
      };
    
    case ACTIONS.UPDATE_LAST_USED:
      const lastUsedUpdated = state.foods.map(food =>
        food.id === action.payload ? { ...food, lastUsed: new Date().toISOString() } : food
      );
      return {
        ...state,
        foods: lastUsedUpdated,
        filteredFoods: lastUsedUpdated
      };
    
    case ACTIONS.CREATE_DISH:
      const { dishName, ingredients } = action.payload;
      
      // Calculate total grams and nutrition for the dish
      const totalGrams = ingredients.reduce((sum, ing) => sum + ing.grams, 0);
      const dishNutrition = CalculationService.calculateDishNutrition(ingredients, state.foods);
      const nutritionPer100g = CalculationService.convertToNutritionPer100g(dishNutrition, totalGrams);
      
      const newDish = {
        id: Date.now().toString(),
        name: dishName,
        category: 'dishes',
        isDish: true,
        ingredients: ingredients,
        totalGrams: totalGrams,
        nutritionPer100g: nutritionPer100g,
        userAdded: true,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      };
      
      const updatedFoodsWithDish = [...state.foods, newDish];
      return {
        ...state,
        foods: updatedFoodsWithDish,
        filteredFoods: updatedFoodsWithDish
      };
    
    default:
      return state;
  }
}

const initialState = {
  foods: [],
  filteredFoods: [],
  searchTerm: '',
  loading: true
};

export function FoodProvider({ children }) {
  const [state, dispatch] = useReducer(foodReducer, initialState);

  useEffect(() => {
    loadFoods();
  }, []);

  useEffect(() => {
    if (!state.loading) {
      saveFoods();
    }
  }, [state.foods, state.loading]);

  const loadFoods = async () => {
    try {
      const storedFoods = await AsyncStorage.getItem('foods');
      if (storedFoods) {
        const foods = JSON.parse(storedFoods);
        dispatch({ type: ACTIONS.LOAD_FOODS, payload: foods });
      } else {
        dispatch({ type: ACTIONS.LOAD_FOODS, payload: defaultFoods });
        await AsyncStorage.setItem('foods', JSON.stringify(defaultFoods));
      }
    } catch (error) {
      console.error('Error loading foods:', error);
      dispatch({ type: ACTIONS.LOAD_FOODS, payload: defaultFoods });
    }
  };

  const saveFoods = async () => {
    try {
      await AsyncStorage.setItem('foods', JSON.stringify(state.foods));
    } catch (error) {
      console.error('Error saving foods:', error);
    }
  };

  const addFood = (food) => {
    dispatch({ type: ACTIONS.ADD_FOOD, payload: food });
  };

  const updateFood = (food) => {
    dispatch({ type: ACTIONS.UPDATE_FOOD, payload: food });
  };

  const deleteFood = (foodId) => {
    dispatch({ type: ACTIONS.DELETE_FOOD, payload: foodId });
  };

  const searchFoods = (searchTerm) => {
    dispatch({ type: ACTIONS.SEARCH_FOODS, payload: searchTerm });
  };

  const updateLastUsed = (foodId) => {
    dispatch({ type: ACTIONS.UPDATE_LAST_USED, payload: foodId });
  };

  const createDish = (dishName, ingredients) => {
    dispatch({ type: ACTIONS.CREATE_DISH, payload: { dishName, ingredients } });
  };

  const getFoodById = (id) => {
    return state.foods.find(food => food.id === id);
  };

  const getFoodsByCategory = (category) => {
    return state.foods.filter(food => food.category === category);
  };

  const getRecentlyUsed = (limit = 5) => {
    return [...state.foods]
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, limit);
  };

  const reloadFoods = async () => {
    console.log('Reloading foods...');
    await loadFoods();
  };

  const value = {
    ...state,
    addFood,
    updateFood,
    deleteFood,
    searchFoods,
    updateLastUsed,
    createDish,
    getFoodById,
    getFoodsByCategory,
    getRecentlyUsed,
    reloadFoods
  };

  return (
    <FoodContext.Provider value={value}>
      {children}
    </FoodContext.Provider>
  );
}

export function useFood() {
  const context = useContext(FoodContext);
  if (!context) {
    throw new Error('useFood must be used within a FoodProvider');
  }
  return context;
}