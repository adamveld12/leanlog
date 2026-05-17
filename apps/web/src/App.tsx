import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Button, Card } from '@leanlog/ui';
import { useStore } from './state';

function DayList() {
  const { state, addDay } = useStore();
  return (
    <main>
      <h1>leanlog</h1>
      <Button onClick={() => addDay(new Date().toISOString().slice(0, 10))}>Add today</Button>
      <div className="stack">
        {state.days.map((d) => (
          <Card key={d.id}>
            <Link to={`/day/${d.id}`}>{d.date}</Link>
          </Card>
        ))}
      </div>
      <Link to="/settings">Settings</Link>
    </main>
  );
}

function DayDetail() {
  const { dayId } = useParams();
  const { state, addMeal } = useStore();
  const nav = useNavigate();
  const day = state.days.find((d) => d.id === dayId);
  if (!day) return <Navigate to="/" replace />;
  return (
    <main>
      <h2>{day.date}</h2>
      <Button
        onClick={() => {
          const meal = addMeal(day.id, `Meal ${day.meals.length + 1}`);
          if (meal) nav(`/day/${day.id}/meal/${meal.id}`);
        }}
      >
        Add meal
      </Button>
      <div className="stack">
        {day.meals.map((m) => (
          <Card key={m.id}>
            <Link to={`/day/${day.id}/meal/${m.id}`}>{m.name}</Link>
          </Card>
        ))}
      </div>
      <Link to="/">Back</Link>
    </main>
  );
}

function MealEdit() {
  const { dayId, mealId } = useParams();
  const { state } = useStore();
  const day = state.days.find((d) => d.id === dayId);
  const meal = day?.meals.find((m) => m.id === mealId);
  if (!day || !meal) return <Navigate to="/" replace />;
  return (
    <main>
      <h2>{meal.name}</h2>
      <p>Ingredients editor is ready for V1 expansion.</p>
      <Link to={`/day/${day.id}`}>Back</Link>
    </main>
  );
}

function Settings() {
  const { state } = useStore();
  return (
    <main>
      <h2>Settings</h2>
      <p>Calorie target: {state.settings.calorieTarget}</p>
      <Link to="/">Back</Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DayList />} />
      <Route path="/day/:dayId" element={<DayDetail />} />
      <Route path="/day/:dayId/meal/:mealId" element={<MealEdit />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
